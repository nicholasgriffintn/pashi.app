export function requireInput(input: string) {
	if (!input) {
		throw new Error("Enter input first.");
	}
	return input;
}

export function parseLength(input: string, fallback: number, min: number, max: number) {
	return parseInteger(input, fallback, min, max);
}

export function parseCount(input: string, fallback = 1, max = 1000) {
	return parseInteger(input, fallback, 1, max);
}

export function parseInteger(input: string, fallback: number, min: number, max: number) {
	const parsed = input ? Number.parseInt(input, 10) : fallback;
	return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function parseNumber(input: string, fallback: number, min: number, max: number) {
	const parsed = input ? Number.parseFloat(input) : fallback;
	return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function parseBoolean(input: string | undefined, fallback: boolean) {
	if (!input) {
		return fallback;
	}

	const normalised = input.trim().toLowerCase();
	if (["1", "true", "yes", "on"].includes(normalised)) {
		return true;
	}
	if (["0", "false", "no", "off"].includes(normalised)) {
		return false;
	}

	return fallback;
}

export function parseChoice<T extends string>(input: string | undefined, options: readonly T[], fallback: T) {
	const normalised = input?.trim().toLowerCase();
	return options.find((option) => option === normalised) ?? fallback;
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

export function randomDateInRange(startInput: string, endInput: string) {
	const start = parseDate(startInput);
	const end = parseDate(endInput);
	const lower = Math.min(start.getTime(), end.getTime());
	const upper = Math.max(start.getTime(), end.getTime());
	return new Date(Math.floor(lower + randomUnitInterval() * (upper - lower + 1)));
}

export function randomBytes(length: number) {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return bytes;
}

export function randomCharacters(alphabet: string, length: number) {
	return Array.from(randomBytes(length), (byte) => alphabet[byte % alphabet.length]).join("");
}

export function randomHex(length: number) {
	return randomCharacters("0123456789abcdef", length);
}

export function randomChoice<T>(items: readonly T[]) {
	const item = items[randomIntegerInRange(items.length)];
	if (item === undefined) {
		throw new Error("No items available.");
	}

	return item;
}

export function singleOrList<T>(values: readonly T[]): T | T[] {
	const first = values[0];
	return values.length === 1 && first !== undefined ? first : [...values];
}

export function shuffle<T>(items: readonly T[]) {
	const shuffled = [...items];
	for (let index = shuffled.length - 1; index > 0; index -= 1) {
		const swapIndex = randomIntegerInRange(index + 1);
		[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
	}

	return shuffled;
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

export function randomIntegerBetween(min: number, max: number) {
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	return lower + randomIntegerInRange(upper - lower + 1);
}

export function randomUnitInterval() {
	return randomIntegerInRange(1_000_000_000) / 1_000_000_000;
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
	return createDigest(value, "SHA-256");
}

export type DigestAlgorithm = "MD5" | "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export async function createDigest(value: string, algorithm: DigestAlgorithm) {
	if (algorithm === "MD5") {
		return createMd5Digest(new TextEncoder().encode(value));
	}

	const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(value));
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

export function bytesToBase64Url(bytes: Uint8Array) {
	return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function base64UrlToBytes(value: string) {
	const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
	const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
	return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

export function concatBytes(chunks: readonly Uint8Array[]) {
	const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
	const bytes = new Uint8Array(length);
	let offset = 0;

	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return bytes;
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

export function createMd5Digest(value: Uint8Array) {
	const padded = createMd5PaddedBytes(value);
	let a = 0x67452301;
	let b = 0xefcdab89;
	let c = 0x98badcfe;
	let d = 0x10325476;

	for (let offset = 0; offset < padded.length; offset += 64) {
		const words = Array.from({ length: 16 }, (_, index) =>
			readLittleEndianUint32(padded, offset + (index * 4)),
		);
		const initialA = a;
		const initialB = b;
		const initialC = c;
		const initialD = d;

		for (let index = 0; index < 64; index += 1) {
			const { mix, wordIndex } = md5RoundValues(index, b, c, d);
			const next = d;
			d = c;
			c = b;
			b = addUint32(
				b,
				rotateLeft(
					addUint32(a, mix, MD5_CONSTANTS[index], words[wordIndex]),
					MD5_SHIFTS[index],
				),
			);
			a = next;
		}

		a = addUint32(a, initialA);
		b = addUint32(b, initialB);
		c = addUint32(c, initialC);
		d = addUint32(d, initialD);
	}

	return [a, b, c, d].map(littleEndianHex).join("");
}

function createMd5PaddedBytes(bytes: Uint8Array) {
	const bitLength = bytes.length * 8;
	const paddedLength = (((bytes.length + 8) >> 6) + 1) * 64;
	const padded = new Uint8Array(paddedLength);
	padded.set(bytes);
	padded[bytes.length] = 0x80;

	const view = new DataView(padded.buffer);
	view.setUint32(paddedLength - 8, bitLength >>> 0, true);
	view.setUint32(paddedLength - 4, Math.floor(bitLength / 0x1_0000_0000), true);
	return padded;
}

function md5RoundValues(index: number, b: number, c: number, d: number) {
	if (index < 16) {
		return { mix: (b & c) | (~b & d), wordIndex: index };
	}
	if (index < 32) {
		return { mix: (d & b) | (~d & c), wordIndex: ((5 * index) + 1) % 16 };
	}
	if (index < 48) {
		return { mix: b ^ c ^ d, wordIndex: ((3 * index) + 5) % 16 };
	}

	return { mix: c ^ (b | ~d), wordIndex: (7 * index) % 16 };
}

function addUint32(...values: number[]) {
	return values.reduce((total, value) => (total + value) >>> 0, 0);
}

function rotateLeft(value: number, shift: number) {
	return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function readLittleEndianUint32(bytes: Uint8Array, offset: number) {
	return (
		bytes[offset] |
		(bytes[offset + 1] << 8) |
		(bytes[offset + 2] << 16) |
		(bytes[offset + 3] << 24)
	) >>> 0;
}

function littleEndianHex(value: number) {
	return Array.from({ length: 4 }, (_, index) =>
		((value >>> (index * 8)) & 0xff).toString(16).padStart(2, "0"),
	).join("");
}

const MD5_SHIFTS = [
	7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
	5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
	4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
	6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
] as const;

const MD5_CONSTANTS = [
	0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
	0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
	0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
	0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
	0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
	0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
	0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
	0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
	0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
	0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
	0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
	0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
	0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
	0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
	0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
	0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
] as const;
