export function requireInput(input: string) {
	if (!input) {
		throw new Error("Enter input first.");
	}
	return input;
}

export function parseLength(input: string, fallback: number, min: number, max: number) {
	return parseInteger(input, fallback, min, max);
}

export function parseInteger(input: string, fallback: number, min: number, max: number) {
	const parsed = input ? Number.parseInt(input, 10) : fallback;
	return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function parseDelimitedList(input: string) {
	return input
		.split(/\r?\n|,/)
		.map((item) => item.trim())
		.filter(Boolean);
}

export function parseDate(input: string) {
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

export function randomBytes(length: number) {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return bytes;
}

export function randomCharacters(alphabet: string, length: number) {
	return Array.from(randomBytes(length), (byte) => alphabet[byte % alphabet.length]).join("");
}

export function randomChoice<T>(items: readonly T[]) {
	const item = items[randomIntegerInRange(items.length)];
	if (item === undefined) {
		throw new Error("No items available.");
	}

	return item;
}

export function randomIntegerInRange(maxExclusive: number) {
	const range = Math.max(1, maxExclusive);
	const maxUint32 = 0x1_0000_0000;
	const limit = Math.floor(maxUint32 / range) * range;
	let value = randomUint32();

	while (value >= limit) {
		value = randomUint32();
	}

	return value % range;
}

export function slugify(value: string) {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
}

export async function sha256(value: string) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function base64Encode(value: string) {
	return bytesToBase64(new TextEncoder().encode(value));
}

export function bytesToBase64(bytes: Uint8Array) {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCodePoint(byte);
	}
	return btoa(binary);
}

export function hashSeed(value: string) {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return Math.abs(hash);
}

function randomUint32() {
	const bytes = randomBytes(4);
	return (
		(bytes[0] * 0x1_000000) +
		(bytes[1] << 16) +
		(bytes[2] << 8) +
		bytes[3]
	);
}
