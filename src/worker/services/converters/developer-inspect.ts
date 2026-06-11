import { isRecord } from "../../../shared/records.ts";

export type DeveloperInspectFormat =
	| "colour-contrast"
	| "cron"
	| "jwt"
	| "mime-signature"
	| "uuid";

export const DEVELOPER_INSPECT_FORMATS: readonly DeveloperInspectFormat[] = [
	"jwt",
	"uuid",
	"cron",
	"colour-contrast",
	"mime-signature",
];

export class DeveloperInspectError extends Error {}

interface InspectOptions {
	background?: string;
	foreground?: string;
}

export function isDeveloperInspectFormat(value: string): value is DeveloperInspectFormat {
	return DEVELOPER_INSPECT_FORMATS.some((format) => format === value);
}

export function inspectDeveloperText(
	input: string,
	format: DeveloperInspectFormat,
	options: InspectOptions = {},
) {
	switch (format) {
		case "colour-contrast":
			return JSON.stringify(inspectColourContrast(input, options), null, 2);
		case "cron":
			return JSON.stringify(inspectCron(input), null, 2);
		case "jwt":
			return JSON.stringify(inspectJwt(input), null, 2);
		case "mime-signature":
			return JSON.stringify(inspectMimeSignature(input), null, 2);
		case "uuid":
			return JSON.stringify(inspectUuid(input), null, 2);
	}
}

function inspectJwt(input: string) {
	const token = input.trim().replace(/^Bearer\s+/i, "");
	const parts = token.split(".");
	if (parts.length !== 3) {
		throw new DeveloperInspectError("Enter a JWT with header, payload, and signature segments.");
	}

	const header = parseJwtSegment(parts[0], "header");
	const payload = parseJwtSegment(parts[1], "payload");
	return {
		header,
		payload,
		signatureBytes: base64UrlByteLength(parts[2]),
		timing: isRecord(payload) ? jwtTiming(payload) : {},
		warning: "Decoded only; signature is not verified.",
	};
}

function inspectUuid(input: string) {
	const value = input.trim().toLowerCase().replace(/^urn:uuid:/, "").replace(/[{}]/g, "");
	const match = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f])([0-9a-f]{3})-([0-9a-f])([0-9a-f]{3})-([0-9a-f]{12})$/.exec(value);
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
	const fields = input.trim().split(/\s+/);
	if (fields.length !== 5) {
		throw new DeveloperInspectError("Enter a standard five-field cron expression.");
	}

	const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
	return {
		dayOfMonth: explainCronField(dayOfMonth, "day of month", 1, 31),
		dayOfWeek: explainCronField(dayOfWeek, "day of week", 0, 7),
		expression: fields.join(" "),
		hour: explainCronField(hour, "hour", 0, 23),
		minute: explainCronField(minute, "minute", 0, 59),
		month: explainCronField(month, "month", 1, 12),
		summary: cronSummary(minute, hour, dayOfMonth, month, dayOfWeek),
	};
}

function inspectColourContrast(input: string, options: InspectOptions) {
	const inputColours = input.match(/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g) ?? [];
	const foreground = parseHexColour(options.foreground || inputColours[0]);
	const background = parseHexColour(options.background || inputColours[foreground ? 1 : 0]);
	if (!foreground || !background) {
		throw new DeveloperInspectError("Enter foreground and background hex colours.");
	}

	const ratio = contrastRatio(relativeLuminance(foreground), relativeLuminance(background));
	return {
		AA: {
			largeText: ratio >= 3,
			normalText: ratio >= 4.5,
		},
		AAA: {
			largeText: ratio >= 4.5,
			normalText: ratio >= 7,
		},
		background: rgbToHex(background),
		foreground: rgbToHex(foreground),
		ratio: Number(ratio.toFixed(2)),
	};
}

function inspectMimeSignature(input: string) {
	const bytes = inputBytes(input);
	if (bytes.length === 0) {
		throw new DeveloperInspectError("Enter hex bytes, base64 text, or a data URL.");
	}

	const signature = detectSignature(bytes);
	return {
		bytes: bytes.slice(0, 16).map((byte) => byte.toString(16).padStart(2, "0")).join(" "),
		extension: signature.extension,
		mimeType: signature.mimeType,
		name: signature.name,
	};
}

function parseJwtSegment(segment: string, name: string) {
	try {
		return JSON.parse(base64UrlToText(segment));
	} catch {
		throw new DeveloperInspectError(`Enter a JWT with a valid ${name} segment.`);
	}
}

function jwtTiming(payload: Record<string, unknown>) {
	const now = Math.floor(Date.now() / 1000);
	return Object.fromEntries(
		["iat", "nbf", "exp"]
			.filter((claim) => typeof payload[claim] === "number")
			.map((claim) => {
				const seconds = payload[claim] as number;
				return [claim, {
					iso: new Date(seconds * 1000).toISOString(),
					relativeSeconds: seconds - now,
				}];
			}),
	);
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

function explainCronField(value: string, label: string, min: number, max: number) {
	if (value === "*") {
		return `every ${label}`;
	}

	const step = /^\*\/(\d+)$/.exec(value);
	if (step) {
		return `every ${step[1]} ${label}s`;
	}

	if (value.includes(",")) {
		return `${label}s ${value}`;
	}

	if (value.includes("-")) {
		return `${label}s ${value}`;
	}

	const numeric = Number.parseInt(value, 10);
	if (Number.isInteger(numeric) && numeric >= min && numeric <= max) {
		return `${label} ${numeric}`;
	}

	return `custom ${label} field: ${value}`;
}

function cronSummary(
	minute: string,
	hour: string,
	dayOfMonth: string,
	month: string,
	dayOfWeek: string,
) {
	if (minute.startsWith("*/") && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
		return `Every ${minute.slice(2)} minutes`;
	}
	if (minute !== "*" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
		return `Every hour at minute ${minute}`;
	}
	if (minute !== "*" && hour !== "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
		return `Every day at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
	}
	if (minute !== "*" && hour !== "*" && dayOfMonth === "*" && month === "*" && dayOfWeek !== "*") {
		return `Every week on day ${dayOfWeek} at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
	}
	if (minute !== "*" && hour !== "*" && dayOfMonth !== "*" && month === "*" && dayOfWeek === "*") {
		return `Every month on day ${dayOfMonth} at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
	}

	return "Custom cron schedule";
}

function parseHexColour(value: string | undefined) {
	if (!value) {
		return undefined;
	}

	const hex = value.trim().replace(/^#/, "");
	if (![3, 4, 6, 8].includes(hex.length) || !/^[0-9a-fA-F]+$/.test(hex)) {
		return undefined;
	}

	const expanded = hex.length <= 4
		? [...hex].map((char) => `${char}${char}`).join("")
		: hex;
	return [
		Number.parseInt(expanded.slice(0, 2), 16),
		Number.parseInt(expanded.slice(2, 4), 16),
		Number.parseInt(expanded.slice(4, 6), 16),
	] as const;
}

function relativeLuminance([red, green, blue]: readonly [number, number, number]) {
	const [r, g, b] = [red, green, blue].map((channel) => {
		const value = channel / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(left: number, right: number) {
	const light = Math.max(left, right);
	const dark = Math.min(left, right);
	return (light + 0.05) / (dark + 0.05);
}

function rgbToHex([red, green, blue]: readonly [number, number, number]) {
	return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
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
			Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
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

function detectSignature(bytes: readonly number[]) {
	const starts = (signature: readonly number[]) => signature.every((byte, index) => bytes[index] === byte);
	const ascii = String.fromCharCode(...bytes.slice(0, 16));
	if (starts([0x89, 0x50, 0x4e, 0x47])) {
		return { extension: "png", mimeType: "image/png", name: "PNG image" };
	}
	if (starts([0xff, 0xd8, 0xff])) {
		return { extension: "jpg", mimeType: "image/jpeg", name: "JPEG image" };
	}
	if (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")) {
		return { extension: "gif", mimeType: "image/gif", name: "GIF image" };
	}
	if (ascii.startsWith("%PDF-")) {
		return { extension: "pdf", mimeType: "application/pdf", name: "PDF document" };
	}
	if (starts([0x50, 0x4b, 0x03, 0x04])) {
		return { extension: "zip", mimeType: "application/zip", name: "ZIP archive" };
	}
	if (ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WEBP") {
		return { extension: "webp", mimeType: "image/webp", name: "WebP image" };
	}
	if (ascii.startsWith("OggS")) {
		return { extension: "ogg", mimeType: "application/ogg", name: "Ogg container" };
	}
	if (ascii.startsWith("ID3")) {
		return { extension: "mp3", mimeType: "audio/mpeg", name: "MP3 audio" };
	}
	if (ascii.startsWith("\0asm")) {
		return { extension: "wasm", mimeType: "application/wasm", name: "WebAssembly binary" };
	}

	return { extension: "unknown", mimeType: "application/octet-stream", name: "Unknown binary data" };
}

function base64UrlToText(value: string) {
	const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
	const binary = atob(padded);
	return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0));
}

function base64UrlByteLength(value: string) {
	const padded = value.padEnd(Math.ceil(value.length / 4) * 4, "=");
	return Math.floor((padded.length * 3) / 4) - (padded.endsWith("==") ? 2 : padded.endsWith("=") ? 1 : 0);
}
