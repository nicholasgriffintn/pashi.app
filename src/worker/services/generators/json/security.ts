import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import {
	bytesToBase64Url,
	parseCount,
	parseInteger,
	randomBytes,
	randomIntegerInRange,
	singleOrList,
} from "../../../utils/generation";
import { arrayBufferToPem } from "../../../utils/crypto";
import { fieldsResult, textResult } from "./result";

export async function createSecurityResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): Promise<JsonResult | undefined> {
	switch (generator.id) {
		case "api-key":
			return textResult(generator, request.input, createApiKeys(request));
		case "bearer-token":
			return textResult(generator, request.input, createBearerTokens(request));
		case "encryption-key":
			return fieldsResult(generator, request.input, createEncryptionKey(request));
		case "jwt-token":
			return fieldsResult(generator, request.input, await createJwtToken(generator, request));
		case "oauth-token":
			return textResult(generator, request.input, createOauthTokens(request));
		case "port-number":
			return textResult(generator, request.input, createPortNumbers(request));
		case "salt":
			return textResult(generator, request.input, createSalts(request));
		case "ssh-key":
			return fieldsResult(generator, request.input, await createKeyPair());
		case "webhook-secret":
			return textResult(generator, request.input, createWebhookSecrets(request));
		default:
			return undefined;
	}
}

async function createKeyPair() {
	const generatedKey = await crypto.subtle.generateKey(
		{
			name: "ECDSA",
			namedCurve: "P-256",
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
		algorithm: "ECDSA P-256",
		privateKey: arrayBufferToPem("PRIVATE KEY", requireArrayBuffer(privateKey)),
		publicKey: arrayBufferToPem("PUBLIC KEY", requireArrayBuffer(publicKey)),
	};
}

function requireCryptoKeyPair(value: CryptoKey | CryptoKeyPair): CryptoKeyPair {
	if ("privateKey" in value && "publicKey" in value) {
		return value;
	}

	throw new Error("Key generation did not return a key pair.");
}

function requireArrayBuffer(value: ArrayBuffer | JsonWebKey): ArrayBuffer {
	if (value instanceof ArrayBuffer) {
		return value;
	}

	throw new Error("Key export did not return binary key material.");
}

function createApiKeys(request: GeneratorRequest) {
	const prefix = (request.fields.prefix || "pk_live").trim().replace(/[^a-zA-Z0-9_-]/g, "") || "pk_live";
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => `${prefix}_${createToken(request, 32)}`));
}

function createToken(request: GeneratorRequest, fallbackBytes: number) {
	const bytes = parseInteger(request.fields.bytes ?? request.input, fallbackBytes, 8, 128);
	return bytesToBase64Url(randomBytes(bytes));
}

function createBearerTokens(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => `Bearer ${createToken(request, 48)}`));
}

function createOauthTokens(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => `ya29.${createToken(request, 64)}`));
}

function createSalts(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => createToken(request, 24)));
}

function createWebhookSecrets(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => `whsec_${createToken(request, 32)}`));
}

function createEncryptionKey(request: GeneratorRequest) {
	const bits = parseInteger(request.fields.bits ?? request.input, 256, 128, 512);
	const bytes = Math.ceil(bits / 8);
	const key = randomBytes(bytes);
	return {
		base64url: bytesToBase64Url(key),
		bits: `${bytes * 8}`,
		hex: Array.from(key, (byte) => byte.toString(16).padStart(2, "0")).join(""),
	};
}

async function createJwtToken(generator: GeneratorTool, request: GeneratorRequest) {
	const subject = request.fields.subject?.trim() || "user_123";
	const issuer = request.fields.issuer?.trim() || "pashi";
	const secret = randomBytes(32);
	const issuedAt = Math.floor(Date.now() / 1000);
	const expiresIn = parseInteger(request.fields.expiresIn ?? "", 3600, 60, 86_400 * 30);
	const header = { alg: "HS256", typ: "JWT" };
	const payload = {
		exp: issuedAt + expiresIn,
		iat: issuedAt,
		iss: issuer,
		jti: crypto.randomUUID(),
		sub: subject,
	};
	const tokenBody = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
	const signature = await signHmacSha256(tokenBody, secret);
	const token = `${tokenBody}.${signature}`;

	return {
		algorithm: "HS256",
		expiresIn: `${expiresIn}`,
		secret: bytesToBase64Url(secret),
		token,
		type: generator.id,
	};
}

function base64UrlJson(value: unknown) {
	return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

async function signHmacSha256(value: string, secret: Uint8Array) {
	const key = await crypto.subtle.importKey(
		"raw",
		secret,
		{ hash: "SHA-256", name: "HMAC" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
	return bytesToBase64Url(new Uint8Array(signature));
}

function createPortNumber(request: GeneratorRequest) {
	const min = parseInteger(request.fields.min ?? "", 1024, 1, 65_535);
	const max = parseInteger(request.fields.max ?? "", 65_535, 1, 65_535);
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	return lower + randomIntegerInRange(upper - lower + 1);
}

function createPortNumbers(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => `${createPortNumber(request)}`));
}
