import { bytesToBase64, bytesToBase64Url, randomBytes, randomCharacters, randomHex } from "./generation";

export type TokenFormat = "alphanumeric" | "base64" | "base64url" | "hex" | "numeric" | "uuid";

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const NUMERIC = "0123456789";

export function arrayBufferToPem(label: string, value: ArrayBuffer) {
	const base64 = bytesToBase64(new Uint8Array(value));
	const lines = base64.match(/.{1,64}/g) ?? [];
	return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

export function requireCryptoKeyPair(value: CryptoKey | CryptoKeyPair): CryptoKeyPair {
	if ("privateKey" in value && "publicKey" in value) {
		return value;
	}

	throw new Error("Key generation did not return a key pair.");
}

export function requireArrayBuffer(value: ArrayBuffer | JsonWebKey): ArrayBuffer {
	if (value instanceof ArrayBuffer) {
		return value;
	}

	throw new Error("Key export did not return binary key material.");
}

export function requireJsonWebKey(value: ArrayBuffer | JsonWebKey): JsonWebKey {
	if (!(value instanceof ArrayBuffer)) {
		return value;
	}

	throw new Error("Key export did not return JSON key material.");
}

export function createRandomToken(format: TokenFormat, length: number) {
	switch (format) {
		case "alphanumeric":
			return randomCharacters(ALPHANUMERIC, length);
		case "base64":
			return encodedToken(length, (bytes) => bytesToBase64(bytes).replace(/=+$/, ""));
		case "base64url":
			return encodedToken(length, bytesToBase64Url);
		case "hex":
			return randomHex(length).toUpperCase();
		case "numeric":
			return randomCharacters(NUMERIC, length);
		case "uuid":
			return crypto.randomUUID();
	}
}

function encodedToken(length: number, encode: (bytes: Uint8Array) => string) {
	let value = "";

	while (value.length < length) {
		value += encode(randomBytes(Math.ceil(length * 0.75) + 2));
	}

	return value.slice(0, length);
}
