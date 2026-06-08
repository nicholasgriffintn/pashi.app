import {
	assertQrPayloadByteLength,
	createQrPng,
	createQrSvg,
	MAX_QR_PAYLOAD_BYTES,
	normaliseQrSize,
} from "../lib/qr";

type Audience = "Design" | "Engineering" | "Product";
type ResultKind = "fields" | "image" | "palette" | "text";
type GeneratorResultValue = string | string[] | Record<string, string>;

interface GeneratorTool {
	audience: Audience;
	description: string;
	endpoint: string;
	id: string;
	input: {
		label: string;
		required: boolean;
	};
	label: string;
	placeholder: string;
	result: {
		kind: ResultKind;
	};
}

interface JsonResult {
	input: string;
	kind: Exclude<ResultKind, "image">;
	label: string;
	meta: string;
	result: GeneratorResultValue;
	type: string;
}

export const GENERATOR_TOOLS: readonly GeneratorTool[] = [
	tool("qr", "QR image", "Engineering", "QR image for links and notes.", "Input", true, "https://pashi.app", "image"),
	tool("uuid", "UUID", "Engineering", "Random v4 ID.", "Input", false, "Optional label", "text"),
	tool("token", "Token", "Engineering", "URL-safe random token.", "Length", false, "32", "text"),
	tool("password", "Password", "Engineering", "Strong random password.", "Length", false, "24", "text"),
	tool("hash", "SHA-256", "Engineering", "SHA-256 digest.", "Input", true, "Text to hash", "text"),
	tool("base64", "Base64", "Engineering", "Base64 encode text.", "Input", true, "Text to encode", "text"),
	tool("url", "URL encode", "Engineering", "URL encode text.", "Input", true, "Text or URL", "text"),
	tool("slug", "Slug", "Engineering", "Safe URL slug.", "Input", true, "Launch notes v2", "text"),
	tool("timestamp", "Timestamp", "Engineering", "Epoch and ISO date values.", "Input", false, "Optional date or epoch", "fields"),
	tool("palette", "Palette", "Design", "Seeded five-colour palette.", "Input", false, "Cyber citrus checkout", "palette"),
	tool("lorem", "Microcopy", "Design", "Practical UI copy set.", "Surface", false, "Checkout empty state", "fields"),
	tool("utm", "UTM link", "Product", "Campaign URL with UTM tags.", "URL", false, "https://nicholasgriffin.dev/pricing", "text"),
	tool("user-story", "User story", "Product", "Product story with context.", "Feature", false, "Team invites", "fields"),
	tool("release", "Release note", "Product", "Release note draft.", "Change", false, "Faster QR generation", "fields"),
	tool("acceptance", "Criteria", "Product", "Acceptance criteria.", "Feature", false, "QR download button", "fields"),
];

export function listGeneratorTools() {
	return GENERATOR_TOOLS;
}

export async function createGeneratorResponse(
	type: string,
	input: string,
	params = new URLSearchParams(),
) {
	const generator = findGenerator(type);
	if (!generator) {
		return json({ error: "Unknown generator type." }, 404);
	}

	if (generator.result.kind === "image") {
		return createQrResponse(input, params);
	}

	try {
		return json(await createJsonResult(generator, input.trim()));
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : "Generation failed." },
			400,
		);
	}
}

function findGenerator(type: string) {
	return GENERATOR_TOOLS.find((generator) => generator.id === type);
}

function tool(
	id: string,
	label: string,
	audience: Audience,
	description: string,
	inputLabel: string,
	required: boolean,
	placeholder: string,
	resultKind: ResultKind,
): GeneratorTool {
	return {
		audience,
		description,
		endpoint: `/api/${id}`,
		id,
		input: { label: inputLabel, required },
		label,
		placeholder,
		result: { kind: resultKind },
	};
}

function json(data: unknown, status = 200) {
	return Response.json(data, { status });
}

function createQrResponse(input: string, params: URLSearchParams) {
	const payload = input.trim();
	if (!payload) {
		return json({ error: "Pass a non-empty input." }, 400);
	}

	try {
		assertQrPayloadByteLength(payload);
	} catch {
		return json(
			{ error: `QR payloads are limited to ${MAX_QR_PAYLOAD_BYTES} UTF-8 bytes.` },
			400,
		);
	}

	const format = params.get("format") === "svg" ? "svg" : "png";
	const size = normaliseQrSize(params.get("size"));
	const image =
		format === "svg"
			? createQrSvg(payload, size.width, size.height)
			: createQrPng(payload, size.width, size.height);

	return new Response(image, {
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": format === "svg" ? "image/svg+xml; charset=utf-8" : "image/png",
			"X-Content-Type-Options": "nosniff",
		},
	});
}

async function createJsonResult(generator: GeneratorTool, input: string): Promise<JsonResult> {
	switch (generator.id) {
		case "acceptance":
			return fieldsResult(generator, input, createAcceptanceCriteria(input));
		case "base64":
			return textResult(generator, input, base64Encode(requireInput(input)));
		case "hash":
			return textResult(generator, input, await sha256(requireInput(input)));
		case "lorem":
			return fieldsResult(generator, input, createMicrocopySet(input));
		case "palette":
			return paletteResult(generator, input, createPalette(input || "Pashi"));
		case "password":
			return textResult(generator, input, createPassword(parseLength(input, 24, 12, 64)));
		case "release":
			return fieldsResult(generator, input, createReleaseNote(input));
		case "slug":
			return textResult(generator, input, slugify(requireInput(input)));
		case "timestamp":
			return fieldsResult(generator, input, createTimestamp(input));
		case "token":
			return textResult(generator, input, createToken(parseLength(input, 32, 8, 96)));
		case "utm":
			return textResult(generator, input, createUtmLink(input));
		case "url":
			return textResult(generator, input, encodeURIComponent(requireInput(input)));
		case "user-story":
			return fieldsResult(generator, input, createUserStory(input));
		case "uuid":
			return textResult(generator, input, crypto.randomUUID());
		default:
			throw new Error("Unknown generator type.");
	}
}

function fieldsResult(
	generator: GeneratorTool,
	input: string,
	result: Record<string, string>,
): JsonResult {
	return {
		input,
		kind: "fields",
		label: generator.label,
		meta: "Structured",
		result,
		type: generator.id,
	};
}

function paletteResult(generator: GeneratorTool, input: string, result: string[]): JsonResult {
	return {
		input,
		kind: "palette",
		label: generator.label,
		meta: "Five colours",
		result,
		type: generator.id,
	};
}

function textResult(generator: GeneratorTool, input: string, result: string): JsonResult {
	return {
		input,
		kind: "text",
		label: generator.label,
		meta: "Ready",
		result,
		type: generator.id,
	};
}

function createMicrocopySet(input: string) {
	const subject = sentenceSubject(input, "this step");
	return {
		body: `${subject} is ready when you are. Add the details now, or come back once the signal is clearer.`,
		button: "Continue",
		empty: `No ${subject.toLowerCase()} yet.`,
		heading: `Add ${subject}`,
	};
}

function createUserStory(input: string) {
	const feature = sentenceSubject(input, "this workflow");
	return {
		acceptanceHint: `Success means the user can complete ${feature.toLowerCase()} without switching context.`,
		benefit: "So that I can finish the job with less manual work.",
		need: `I want ${feature.toLowerCase()}.`,
		story: `As a user, I want ${feature.toLowerCase()} so that I can finish the job with less manual work.`,
	};
}

function createReleaseNote(input: string) {
	const change = sentenceSubject(input, "the generator flow");
	return {
		detail: `${change} now takes fewer steps and keeps the generated output easier to inspect.`,
		impact: "Teams can create and share the asset faster.",
		title: `Improved ${change}`,
		type: "Improvement",
	};
}

function createAcceptanceCriteria(input: string) {
	const feature = sentenceSubject(input, "the generator");
	return {
		error: "When the input is invalid, show a clear error without clearing the form.",
		generation: `Given valid input for ${feature.toLowerCase()}, when I generate it, then a result appears.`,
		loading: "While generation is running, reserve the final result area to avoid layout shift.",
		ready: "The result can be copied, scanned, or inspected without extra navigation.",
	};
}

function createTimestamp(input: string) {
	const date = parseDate(input);
	return {
		epochMilliseconds: `${date.getTime()}`,
		epochSeconds: `${Math.floor(date.getTime() / 1000)}`,
		iso: date.toISOString(),
		utc: date.toUTCString(),
	};
}

function createUtmLink(input: string) {
	let url: URL;
	try {
		url = new URL(input || "https://nicholasgriffin.dev/");
	} catch {
		try {
			url = new URL(`https://${input}`);
		} catch {
			url = new URL("https://nicholasgriffin.dev/");
		}
	}

	url.searchParams.set("utm_source", "pashi");
	url.searchParams.set("utm_medium", "generate");
	url.searchParams.set("utm_campaign", slugify(url.hostname.replace(/^www\./, "")) || "campaign");
	return url.toString();
}

function createPalette(seed: string) {
	const base = hashSeed(seed);
	return Array.from({ length: 5 }, (_, index) => {
		const hue = (base + index * 43) % 360;
		const saturation = 62 + ((base + index * 11) % 18);
		const lightness = 44 + ((base + index * 7) % 16);
		return hslToHex(hue, saturation, lightness);
	});
}

function createToken(length: number) {
	return bytesToBase64(randomBytes(length)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function createPassword(length: number) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=";
	return Array.from(randomBytes(length), (byte) => alphabet[byte % alphabet.length]).join("");
}

function sentenceSubject(input: string, fallback: string) {
	const trimmed = input.trim();
	return trimmed || fallback;
}

function requireInput(input: string) {
	if (!input) {
		throw new Error("Enter input first.");
	}
	return input;
}

function parseLength(input: string, fallback: number, min: number, max: number) {
	const parsed = input ? Number.parseInt(input, 10) : fallback;
	return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function parseDate(input: string) {
	if (!input) {
		return new Date();
	}

	const numeric = Number(input);
	if (Number.isFinite(numeric)) {
		return new Date(input.length <= 10 ? numeric * 1000 : numeric);
	}

	const parsed = new Date(input);
	return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function randomBytes(length: number) {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return bytes;
}

function slugify(value: string) {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
}

async function sha256(value: string) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64Encode(value: string) {
	return bytesToBase64(new TextEncoder().encode(value));
}

function bytesToBase64(bytes: Uint8Array) {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCodePoint(byte);
	}
	return btoa(binary);
}

function hashSeed(value: string) {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return Math.abs(hash);
}

function hslToHex(hue: number, saturation: number, lightness: number) {
	const s = saturation / 100;
	const l = lightness / 100;
	const chroma = (1 - Math.abs(2 * l - 1)) * s;
	const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = l - chroma / 2;
	const [r, g, b] =
		hue < 60
			? [chroma, x, 0]
			: hue < 120
				? [x, chroma, 0]
				: hue < 180
					? [0, chroma, x]
					: hue < 240
						? [0, x, chroma]
						: hue < 300
							? [x, 0, chroma]
							: [chroma, 0, x];
	return [r, g, b]
		.map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase()
		.replace(/^/, "#");
}
