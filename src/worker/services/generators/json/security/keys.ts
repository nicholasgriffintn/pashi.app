import type { GeneratorRequest } from "../../request";
import {
	bytesToBase64,
	bytesToBase64Url,
	parseBoolean,
	parseChoice,
	parseCount,
	parseInteger,
	randomBytes,
	singleOrList,
} from "../../../../utils/generation";
import { arrayBufferToPem, requireArrayBuffer, requireCryptoKeyPair } from "../../../../utils/crypto";

const KEY_ALGORITHMS = ["aes", "hmac", "rsa"] as const;
const KEY_FORMATS = ["hex", "base64", "base64url", "pem"] as const;

type KeyAlgorithm = (typeof KEY_ALGORITHMS)[number];
type KeyFormat = (typeof KEY_FORMATS)[number];

export async function createEncryptionKeys(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 10);
	const keys = await Promise.all(Array.from({ length: count }, () => createEncryptionKey(request)));
	return singleOrList(keys);
}

async function createEncryptionKey(request: GeneratorRequest) {
	const algorithm = parseChoice(request.fields.algorithm, KEY_ALGORITHMS, "aes");
	if (algorithm === "rsa") {
		return createRsaKeyPair(request);
	}

	return createSymmetricKey(request, algorithm);
}

function createSymmetricKey(request: GeneratorRequest, algorithm: Exclude<KeyAlgorithm, "rsa">) {
	const keySize = parseSymmetricKeySize(request, algorithm);
	const format = parseChoice(request.fields.format, KEY_FORMATS, "hex");
	const includeIv = parseBoolean(request.fields.includeIv ?? request.fields.include_iv, algorithm === "aes");
	const keyBytes = randomBytes(keySize / 8);
	const record = {
		algorithm: algorithm === "aes" ? `AES-${keySize}` : `HMAC-SHA-${keySize}`,
		bits: `${keySize}`,
		format: format === "pem" ? "base64" : format,
		key: encodeKeyMaterial(keyBytes, format === "pem" ? "base64" : format),
	};

	if (!includeIv) {
		return record;
	}

	const iv = randomBytes(algorithm === "aes" ? 16 : 32);
	return {
		...record,
		iv: encodeKeyMaterial(iv, format === "pem" ? "base64" : format),
		ivBytes: `${iv.byteLength}`,
	};
}

async function createRsaKeyPair(request: GeneratorRequest) {
	const keySize = parseInteger(request.fields.keySize ?? request.fields.key_size ?? request.fields.bits ?? "", 2048, 2048, 4096);
	const generatedKey = await crypto.subtle.generateKey(
		{
			hash: "SHA-256",
			modulusLength: keySize,
			name: "RSASSA-PKCS1-v1_5",
			publicExponent: new Uint8Array([1, 0, 1]),
		},
		true,
		["sign", "verify"],
	);
	const keyPair = requireCryptoKeyPair(generatedKey);
	const [privateKey, publicKey] = await Promise.all([
		crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
		crypto.subtle.exportKey("spki", keyPair.publicKey),
	]);

	return {
		algorithm: `RSA-${keySize}`,
		bits: `${keySize}`,
		format: "pem",
		privateKey: arrayBufferToPem("PRIVATE KEY", requireArrayBuffer(privateKey)),
		publicKey: arrayBufferToPem("PUBLIC KEY", requireArrayBuffer(publicKey)),
	};
}

function parseSymmetricKeySize(request: GeneratorRequest, algorithm: Exclude<KeyAlgorithm, "rsa">) {
	const fallback = algorithm === "aes" ? 256 : 512;
	const rawSize = parseInteger(request.fields.keySize ?? request.fields.key_size ?? request.fields.bits ?? "", fallback, 128, 512);
	if (algorithm === "aes") {
		return closestAllowedSize(rawSize, [128, 192, 256]);
	}

	return closestAllowedSize(rawSize, [256, 384, 512]);
}

function closestAllowedSize(value: number, allowedSizes: readonly number[]) {
	return allowedSizes.reduce((best, size) =>
		Math.abs(size - value) < Math.abs(best - value) ? size : best,
	);
}

function encodeKeyMaterial(bytes: Uint8Array, format: Exclude<KeyFormat, "pem">) {
	switch (format) {
		case "base64":
			return bytesToBase64(bytes);
		case "base64url":
			return bytesToBase64Url(bytes);
		case "hex":
			return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
	}
}
