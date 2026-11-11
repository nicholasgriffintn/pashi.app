import { isRecord } from "../../../shared/records.ts";
import {
	contrastRatio,
	findCssColours,
	parseCssColour,
	relativeLuminance,
	rgbToHex,
} from "../../utils/color.ts";
import {
	CRON_SEARCH_HORIZON_YEARS,
	CronExpressionError,
	describeCronField,
	describeCronSchedule,
	nextCronRuns,
	parseCronExpression,
} from "../../utils/cron.ts";
import { detectFileSignature } from "../../utils/file-signature.ts";
import { base64UrlToBytes } from "../../utils/generation.ts";
import { identifyHash } from "../../utils/hash-type.ts";
import {
	checkJwtSignature,
	isJwtSecretEncoding,
	JWT_SECRET_ENCODINGS,
	type JwtKeyMaterial,
	JwtKeyError,
	type JwtSignedParts,
} from "../../utils/jwt.ts";
import { parseUserAgent } from "../../utils/user-agent.ts";

export type DeveloperInspectFormat =
	| "colour-contrast"
	| "cron"
	| "hash-type"
	| "jwt"
	| "mime-signature"
	| "user-agent"
	| "uuid";

export const DEVELOPER_INSPECT_FORMATS: readonly DeveloperInspectFormat[] = [
	"jwt",
	"uuid",
	"cron",
	"colour-contrast",
	"mime-signature",
	"hash-type",
	"user-agent",
];

const CRON_RUN_COUNT = 5;
const MAX_COLOUR_LENGTH = 400;
const MAX_CRON_LENGTH = 200;
const MAX_HASH_LENGTH = 1024;
const MAX_JWT_KEY_LENGTH = 8192;
const MAX_JWT_LENGTH = 16_384;
const MAX_NUMERIC_DATE_SECONDS = 8_640_000_000_000;
const MAX_USER_AGENT_LENGTH = 1024;

export class DeveloperInspectError extends Error {
	readonly status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.status = status;
	}
}

interface InspectOptions {
	background?: string;
	foreground?: string;
	publicKey?: string;
	secret?: string;
	secretEncoding?: string;
}

export function isDeveloperInspectFormat(value: string): value is DeveloperInspectFormat {
	return DEVELOPER_INSPECT_FORMATS.some((format) => format === value);
}

export async function inspectDeveloperText(
	input: string,
	format: DeveloperInspectFormat,
	options: InspectOptions = {},
) {
	switch (format) {
		case "colour-contrast":
			return JSON.stringify(inspectColourContrast(input, options), null, 2);
		case "cron":
			return JSON.stringify(inspectCron(input), null, 2);
		case "hash-type":
			return JSON.stringify(inspectHashType(input), null, 2);
		case "jwt":
			return JSON.stringify(await inspectJwt(input, options), null, 2);
		case "mime-signature":
			return JSON.stringify(inspectMimeSignature(input), null, 2);
		case "user-agent":
			return JSON.stringify(inspectUserAgent(input), null, 2);
		case "uuid":
			return JSON.stringify(inspectUuid(input), null, 2);
	}
}

function assertWithinBudget(value: string, limit: number, label: string) {
	if (value.length > limit) {
		throw new DeveloperInspectError(`${label} is longer than the ${limit} character limit.`, 422);
	}
}

async function inspectJwt(input: string, options: InspectOptions) {
	assertWithinBudget(input, MAX_JWT_LENGTH, "The JWT");

	const token = input.trim().replace(/^Bearer\s+/i, "");
	const parts = token.split(".");

	if (parts.length !== 3) {
		throw new DeveloperInspectError("Enter a JWT with header, payload, and signature segments.");
	}

	const [headerSegment, payloadSegment, signatureSegment] = parts;
	const header = parseJwtSegment(headerSegment, "header");
	const payload = parseJwtSegment(payloadSegment, "payload");
	const claims = isRecord(payload) ? payload : {};
	const signature = await inspectJwtSignature(
		{
			algorithm: isRecord(header) ? header.alg : undefined,
			signature: signatureSegment,
			signingInput: `${headerSegment}.${payloadSegment}`,
		},
		jwtKeyMaterial(options),
	);
	const now = Math.floor(Date.now() / 1000);
	const wasChecked = signature.status !== "not-checked" && signature.status !== "unsupported";

	return {
		claims: {
			expiry: jwtExpiryStatus(numericDate(claims.exp), now),
			notBefore: jwtNotBeforeStatus(numericDate(claims.nbf), now),
		},
		header,
		payload,
		signature,
		signatureBytes: base64UrlByteLength(signatureSegment),
		timing: jwtTiming(claims, now),
		...(wasChecked ? {} : { warning: "Decoded only; the signature was not checked." }),
	};
}

function inspectUuid(input: string) {
	const value = input
		.trim()
		.toLowerCase()
		.replace(/^urn:uuid:/, "")
		.replace(/[{}]/g, "");
	const match =
		/^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f])([0-9a-f]{3})-([0-9a-f])([0-9a-f]{3})-([0-9a-f]{12})$/.exec(
			value,
		);

	if (!match) {
		throw new DeveloperInspectError("Enter a valid hyphenated UUID.");
	}

	const version = Number.parseInt(match[3], 16);
	const variantNibble = Number.parseInt(match[5], 16);
	const inspected: Record<string, string | number | boolean> = {
		canonical: value,
		isNil: value === "00000000-0000-0000-0000-000000000000",
		variant: uuidVariant(variantNibble),
		version,
	};

	if (version === 7) {
		const timestamp = Number.parseInt(`${match[1]}${match[2]}`, 16);

		inspected.timestamp = new Date(timestamp).toISOString();
	}

	return inspected;
}

function inspectCron(input: string) {
	assertWithinBudget(input, MAX_CRON_LENGTH, "The cron expression");

	const schedule = parseCronSchedule(input);
	const nextRuns = nextCronRuns(schedule, new Date(), CRON_RUN_COUNT);

	if (nextRuns.length === 0) {
		throw new DeveloperInspectError(
			`This cron expression never fires within the next ${CRON_SEARCH_HORIZON_YEARS} years.`,
			422,
		);
	}

	return {
		dayOfMonth: describeCronField(schedule.dayOfMonth),
		dayOfWeek: describeCronField(schedule.dayOfWeek),
		expression: schedule.expression,
		hour: describeCronField(schedule.hour),
		minute: describeCronField(schedule.minute),
		month: describeCronField(schedule.month),
		nextRuns: nextRuns.map((run) => run.toISOString()),
		summary: describeCronSchedule(schedule),
	};
}

function parseCronSchedule(input: string) {
	try {
		return parseCronExpression(input);
	} catch (error) {
		if (error instanceof CronExpressionError) {
			throw new DeveloperInspectError(error.message);
		}

		throw error;
	}
}

function inspectColourContrast(input: string, options: InspectOptions) {
	assertWithinBudget(input, MAX_COLOUR_LENGTH, "The colour input");

	const inputColours = findCssColours(input);
	const foreground = options.foreground?.trim()
		? fieldColour(options.foreground, "The foreground colour")
		: inputColours.shift();
	const background = options.background?.trim()
		? fieldColour(options.background, "The background colour")
		: inputColours.shift();

	if (!foreground || !background) {
		throw new DeveloperInspectError(
			"Enter foreground and background colours as hex, rgb(), hsl(), or a CSS colour name.",
		);
	}

	const ratio = contrastRatio(relativeLuminance(foreground), relativeLuminance(background));
	const hasAlpha = foreground.alpha < 1 || background.alpha < 1;

	return {
		AA: {
			largeText: ratio >= 3,
			normalText: ratio >= 4.5,
		},
		AAA: {
			largeText: ratio >= 4.5,
			normalText: ratio >= 7,
		},
		background: rgbToHex(background).toLowerCase(),
		foreground: rgbToHex(foreground).toLowerCase(),
		...(hasAlpha ? { note: "Alpha is ignored; the ratio treats both colours as opaque." } : {}),
		ratio: Number(ratio.toFixed(2)),
	};
}

function fieldColour(value: string, label: string) {
	assertWithinBudget(value, MAX_COLOUR_LENGTH, label);

	return parseCssColour(value) ?? parseCssColour(`#${value.trim()}`);
}

function inspectHashType(input: string) {
	assertWithinBudget(input, MAX_HASH_LENGTH, "The hash");

	if (!input.trim()) {
		throw new DeveloperInspectError("Enter a hash to identify.");
	}

	return identifyHash(input);
}

function inspectUserAgent(input: string) {
	assertWithinBudget(input, MAX_USER_AGENT_LENGTH, "The user agent");

	if (!input.trim()) {
		throw new DeveloperInspectError("Enter a user-agent string to parse.");
	}

	return parseUserAgent(input);
}

function inspectMimeSignature(input: string) {
	const bytes = inputBytes(input);

	if (bytes.length === 0) {
		throw new DeveloperInspectError("Enter hex bytes, base64 text, or a data URL.");
	}

	const signature = detectFileSignature(bytes);

	return {
		bytes: bytes
			.slice(0, 16)
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join(" "),
		extension: signature.extension,
		mimeType: signature.mimeType,
		name: signature.name,
	};
}

function parseJwtSegment(segment: string, name: string): unknown {
	try {
		return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment)));
	} catch {
		throw new DeveloperInspectError(`Enter a JWT with a valid ${name} segment.`);
	}
}

function jwtKeyMaterial(options: InspectOptions): JwtKeyMaterial {
	const secretEncoding = options.secretEncoding?.trim() || "utf8";

	if (!isJwtSecretEncoding(secretEncoding)) {
		throw new DeveloperInspectError(
			`Choose a supported secretEncoding: ${JWT_SECRET_ENCODINGS.join(", ")}.`,
		);
	}

	assertWithinBudget(options.secret ?? "", MAX_JWT_KEY_LENGTH, "The secret");
	assertWithinBudget(options.publicKey ?? "", MAX_JWT_KEY_LENGTH, "The public key");

	return { publicKey: options.publicKey, secret: options.secret, secretEncoding };
}

async function inspectJwtSignature(parts: JwtSignedParts, keys: JwtKeyMaterial) {
	try {
		return await checkJwtSignature(parts, keys);
	} catch (error) {
		if (error instanceof JwtKeyError) {
			throw new DeveloperInspectError(error.message);
		}

		throw error;
	}
}

function numericDate(value: unknown) {
	return typeof value === "number" && Math.abs(value) <= MAX_NUMERIC_DATE_SECONDS
		? value
		: undefined;
}

function jwtExpiryStatus(expiresAt: number | undefined, now: number) {
	if (expiresAt === undefined) {
		return "absent";
	}

	return now >= expiresAt ? "expired" : "valid";
}

function jwtNotBeforeStatus(notBefore: number | undefined, now: number) {
	if (notBefore === undefined) {
		return "absent";
	}

	return now < notBefore ? "not-yet-valid" : "active";
}

function jwtTiming(payload: Record<string, unknown>, now: number) {
	const timing: Record<string, { iso: string; relativeSeconds: number }> = {};

	for (const claim of ["iat", "nbf", "exp"]) {
		const seconds = numericDate(payload[claim]);

		if (seconds !== undefined) {
			timing[claim] = {
				iso: new Date(seconds * 1000).toISOString(),
				relativeSeconds: seconds - now,
			};
		}
	}

	return timing;
}

function uuidVariant(nibble: number) {
	if ((nibble & 0b1000) === 0) {
		return "NCS";
	}

	if ((nibble & 0b1100) === 0b1000) {
		return "RFC 4122";
	}

	if ((nibble & 0b1110) === 0b1100) {
		return "Microsoft";
	}

	return "future";
}

function inputBytes(input: string) {
	const value = input.trim();
	const dataUrl = /^data:[^,]*;base64,(.+)$/i.exec(value);

	if (dataUrl) {
		return base64Bytes(dataUrl[1]);
	}

	const hex = value.replace(/^0x/i, "").replace(/[^0-9a-fA-F]/g, "");

	if (hex.length >= 2 && hex.length % 2 === 0) {
		return Array.from({ length: hex.length / 2 }, (_item, index) =>
			Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16),
		);
	}

	return base64Bytes(value);
}

function base64Bytes(value: string) {
	try {
		const binary = atob(value);

		return [...binary].map((char) => char.codePointAt(0) ?? 0);
	} catch {
		return [];
	}
}

function base64UrlByteLength(value: string) {
	const padded = value.padEnd(Math.ceil(value.length / 4) * 4, "=");

	return (
		Math.floor((padded.length * 3) / 4) - (padded.endsWith("==") ? 2 : padded.endsWith("=") ? 1 : 0)
	);
}
