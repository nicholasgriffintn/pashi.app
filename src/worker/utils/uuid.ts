import { concatBytes, createMd5Digest, randomBytes } from "./generation";

const UUID_EPOCH_OFFSET = 12_219_292_800_000_000n;
const UUID_NAMESPACE_ALIASES = {
	dns: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
	url: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
	oid: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
	x500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
} as const;

export type UuidFormat = "v1" | "v3" | "v4" | "v5" | "v7";
export type UuidOutputFormat = "standard" | "uppercase" | "no-hyphens" | "braced" | "urn";

let lastV1Timestamp = 0n;
let lastV1ClockSeq = 0;
let lastV1ClockSeqInitialized = false;

export async function createUuid(format: UuidFormat, name = "name", namespace = "url") {
	switch (format) {
		case "v1":
			return createV1Uuid();
		case "v3":
			return createV3Uuid(name, parseUuidNamespace(namespace));
		case "v5":
			return createV5Uuid(name, parseUuidNamespace(namespace));
		case "v7":
			return createV7Uuid();
		default:
			return crypto.randomUUID();
	}
}

export function formatUuidForOutput(value: string, outputFormat: UuidOutputFormat) {
	const standard = value.toLowerCase();
	if (outputFormat === "uppercase") {
		return standard.toUpperCase();
	}
	if (outputFormat === "no-hyphens") {
		return standard.replaceAll("-", "");
	}
	if (outputFormat === "braced") {
		return `{${standard}}`;
	}
	if (outputFormat === "urn") {
		return `urn:uuid:${standard}`;
	}

	return standard;
}

export function parseUuidNamespace(value: string) {
	const normalised = value.trim().toLowerCase();
	const alias = UUID_NAMESPACE_ALIASES[normalised as keyof typeof UUID_NAMESPACE_ALIASES];
	const source = alias ?? normalised;
	if (!isUuid(source)) {
		throw new Error("Namespace must be dns, url, oid, x500, or a UUID.");
	}

	return parseUuid(source);
}

function createV1Uuid() {
	if (!lastV1ClockSeqInitialized) {
		lastV1ClockSeq = randomBytes(2).reduce((value, byte, index) => value + (byte << (index * 8)), 0) & 0x3fff;
		lastV1ClockSeqInitialized = true;
	}

	const timestamp = BigInt(Date.now()) * 10_000n + UUID_EPOCH_OFFSET;
	if (timestamp <= lastV1Timestamp) {
		lastV1ClockSeq = (lastV1ClockSeq + 1) & 0x3fff;
	} else {
		lastV1ClockSeq = randomBytes(2).reduce((value, byte, index) => value + (byte << (index * 8)), 0) & 0x3fff;
	}
	lastV1Timestamp = timestamp;

	const timeLow = timestamp & 0xffff_ffffn;
	const timeMid = (timestamp >> 32n) & 0xffffn;
	const timeHi = (timestamp >> 48n & 0x0fffn) | 0x1000n;

	const clockSeq = lastV1ClockSeq | 0x8000;
	const clockSeqBytes = numberToBytes(BigInt(clockSeq), 2);
	clockSeqBytes[0] = (clockSeqBytes[0] & 0x3f) | 0x80;

	const node = randomBytes(6);
	node[0] |= 0x01;

	return formatUuid([
		...numberToBytes(timeLow, 4),
		...numberToBytes(timeMid, 2),
		...numberToBytes(timeHi, 2),
		...clockSeqBytes,
		...node,
	]);
}

async function createV3Uuid(name: string, namespace: Uint8Array) {
	const namespaceAndName = concatBytes([namespace, new TextEncoder().encode(name)]);
	const digest = createMd5Digest(namespaceAndName);
	const hash = bytesFromHex(digest, 16);
	hash[6] = (hash[6] & 0x0f) | 0x30;
	hash[8] = (hash[8] & 0x3f) | 0x80;
	return formatUuid(Array.from(hash));
}

async function createV5Uuid(name: string, namespace: Uint8Array) {
	const namespaceAndName = concatBytes([namespace, new TextEncoder().encode(name)]);
	const digest = await crypto.subtle.digest("SHA-1", namespaceAndName);
	const hash = new Uint8Array(digest).slice(0, 16);
	hash[6] = (hash[6] & 0x0f) | 0x50;
	hash[8] = (hash[8] & 0x3f) | 0x80;
	return formatUuid(Array.from(hash));
}

function createV7Uuid() {
	const timestamp = BigInt(Date.now());
	const random = randomBytes(10);
	const timestampBytes = numberToBytes(timestamp, 6);

	return formatUuid([
		...timestampBytes,
		(random[0] & 0x0f) | 0x70,
		random[1],
		(random[2] & 0x3f) | 0x80,
		...random.slice(3),
	]);
}

function formatUuid(bytes: readonly number[]) {
	const values = Array.from(bytes);
	const groups = [
		values.slice(0, 4),
		values.slice(4, 6),
		values.slice(6, 8),
		values.slice(8, 10),
		values.slice(10, 16),
	];
	return groups
		.map((segment) =>
			segment
				.map((byte) => byte.toString(16).padStart(2, "0"))
				.join(""),
		)
		.join("-");
}

function numberToBytes(value: bigint, length: number) {
	const bytes = new Uint8Array(length);
	for (let index = 0; index < length; index += 1) {
		const offset = (length - 1 - index) * 8;
		bytes[index] = Number((value >> BigInt(offset)) & 0xffn);
	}
	return bytes;
}

function parseUuid(value: string) {
	const hex = value.replaceAll("-", "").toLowerCase();
	if (!/^[0-9a-f]{32}$/i.test(hex)) {
		throw new Error("Namespace must be a valid UUID.");
	}

	return new Uint8Array(
		Array.from({ length: 16 }, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)),
	);
}

function bytesFromHex(value: string, length: number) {
	const bytes = new Uint8Array(length);
	for (let index = 0; index < length; index += 1) {
		const byte = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
		if (Number.isNaN(byte)) {
			throw new Error("Invalid UUID digest.");
		}
		bytes[index] = byte;
	}
	return bytes;
}

function isUuid(value: string) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
