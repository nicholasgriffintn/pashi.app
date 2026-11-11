import { pemToBytes } from "./crypto";
import { bytesToBase64Url, parseBase64Url } from "./generation";

export const JWT_ALGORITHMS = ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"] as const;
export const JWT_SECRET_ENCODINGS = ["utf8", "base64url"] as const;

export type JwtAlgorithm = (typeof JWT_ALGORITHMS)[number];
export type JwtSecretEncoding = (typeof JWT_SECRET_ENCODINGS)[number];
export type JwtSignatureStatus =
	| "invalid"
	| "not-checked"
	| "rejected"
	| "unsupported"
	| "verified";

export interface JwtSignatureCheck {
	algorithm: string | null;
	reason: string;
	status: JwtSignatureStatus;
}

export interface JwtSignedParts {
	algorithm: unknown;
	signature: string;
	signingInput: string;
}

export interface JwtKeyMaterial {
	publicKey?: string;
	secret?: string;
	secretEncoding: JwtSecretEncoding;
}

export class JwtKeyError extends Error {}

const RSA_SIGNATURE_NAME = "RSASSA-PKCS1-v1_5";

export function isJwtAlgorithm(value: string): value is JwtAlgorithm {
	return JWT_ALGORITHMS.some((algorithm) => algorithm === value);
}

export function parseJwtAlgorithm(input: string | undefined, fallback: JwtAlgorithm) {
	const normalised = input?.trim().toUpperCase() ?? "";

	return isJwtAlgorithm(normalised) ? normalised : fallback;
}

export function isJwtSecretEncoding(value: string): value is JwtSecretEncoding {
	return JWT_SECRET_ENCODINGS.some((encoding) => encoding === value);
}

export function jwtHashName(algorithm: JwtAlgorithm) {
	switch (algorithm) {
		case "HS384":
		case "RS384":
			return "SHA-384";
		case "HS512":
		case "RS512":
			return "SHA-512";
		case "HS256":
		case "RS256":
			return "SHA-256";
	}
}

export function jwtRsaKeyAlgorithm(algorithm: JwtAlgorithm) {
	return { hash: jwtHashName(algorithm), name: RSA_SIGNATURE_NAME };
}

export async function signJwtHmac(value: string, secret: Uint8Array, algorithm: JwtAlgorithm) {
	const key = await importJwtHmacKey(secret, algorithm, "sign");
	const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));

	return bytesToBase64Url(new Uint8Array(signature));
}

export async function signJwtRsa(value: string, privateKey: CryptoKey) {
	const signature = await crypto.subtle.sign(
		RSA_SIGNATURE_NAME,
		privateKey,
		new TextEncoder().encode(value),
	);

	return bytesToBase64Url(new Uint8Array(signature));
}

export async function checkJwtSignature(
	parts: JwtSignedParts,
	keys: JwtKeyMaterial,
): Promise<JwtSignatureCheck> {
	const { algorithm } = parts;

	if (typeof algorithm !== "string" || algorithm === "") {
		return {
			algorithm: null,
			reason: "The header has no alg value, so the signature cannot be checked.",
			status: "unsupported",
		};
	}

	if (algorithm.toLowerCase() === "none") {
		return {
			algorithm,
			reason: "Unsigned tokens (alg none) are never accepted, whatever key is supplied.",
			status: "rejected",
		};
	}

	if (!isJwtAlgorithm(algorithm)) {
		return {
			algorithm,
			reason: `Signature checks support ${JWT_ALGORITHMS.join(", ")} only.`,
			status: "unsupported",
		};
	}

	const signature = parseBase64Url(parts.signature);
	const outcome = algorithm.startsWith("HS")
		? await checkHmacSignature(algorithm, parts.signingInput, signature, keys)
		: await checkRsaSignature(algorithm, parts.signingInput, signature, keys);

	return { algorithm, ...outcome };
}

async function checkHmacSignature(
	algorithm: JwtAlgorithm,
	signingInput: string,
	signature: Uint8Array | undefined,
	keys: JwtKeyMaterial,
): Promise<Omit<JwtSignatureCheck, "algorithm">> {
	const secret = keys.secret ?? "";

	if (secret === "") {
		return keys.publicKey?.trim()
			? {
					reason: `${algorithm} is an HMAC algorithm and needs a secret. The public key was not used, because a public key must never act as an HMAC secret.`,
					status: "rejected",
				}
			: {
					reason: `No secret was supplied, so the ${algorithm} signature was not checked.`,
					status: "not-checked",
				};
	}

	if (secret.includes("-----BEGIN")) {
		return {
			reason: `The secret looks like a PEM key. ${algorithm} is an HMAC algorithm, and PEM keys are never used as HMAC secrets.`,
			status: "rejected",
		};
	}

	const secretBytes =
		keys.secretEncoding === "base64url"
			? parseBase64Url(secret.trim())
			: new TextEncoder().encode(secret);

	if (!secretBytes || secretBytes.length === 0) {
		throw new JwtKeyError(
			"Enter the secret as base64url text, or set secretEncoding to utf8 for a plain text secret.",
		);
	}

	if (!signature) {
		return { reason: "The signature segment is not valid base64url.", status: "invalid" };
	}

	const key = await importJwtHmacKey(secretBytes, algorithm, "verify");
	const isValid = await crypto.subtle.verify(
		"HMAC",
		key,
		signature,
		new TextEncoder().encode(signingInput),
	);

	return isValid
		? { reason: `The ${algorithm} signature matches the supplied secret.`, status: "verified" }
		: {
				reason: `The ${algorithm} signature does not match the supplied secret.`,
				status: "invalid",
			};
}

async function checkRsaSignature(
	algorithm: JwtAlgorithm,
	signingInput: string,
	signature: Uint8Array | undefined,
	keys: JwtKeyMaterial,
): Promise<Omit<JwtSignatureCheck, "algorithm">> {
	const publicKey = keys.publicKey?.trim() ?? "";

	if (publicKey === "") {
		return keys.secret
			? {
					reason: `${algorithm} is an RSA algorithm and needs a PEM public key. The secret was not used.`,
					status: "rejected",
				}
			: {
					reason: `No public key was supplied, so the ${algorithm} signature was not checked.`,
					status: "not-checked",
				};
	}

	const key = await importJwtRsaPublicKey(publicKey, algorithm);

	if (!signature) {
		return { reason: "The signature segment is not valid base64url.", status: "invalid" };
	}

	const isValid = await crypto.subtle.verify(
		RSA_SIGNATURE_NAME,
		key,
		signature,
		new TextEncoder().encode(signingInput),
	);

	return isValid
		? { reason: `The ${algorithm} signature matches the supplied public key.`, status: "verified" }
		: {
				reason: `The ${algorithm} signature does not match the supplied public key.`,
				status: "invalid",
			};
}

function importJwtHmacKey(secret: Uint8Array, algorithm: JwtAlgorithm, usage: "sign" | "verify") {
	return crypto.subtle.importKey(
		"raw",
		secret,
		{ hash: jwtHashName(algorithm), name: "HMAC" },
		false,
		[usage],
	);
}

async function importJwtRsaPublicKey(pem: string, algorithm: JwtAlgorithm) {
	const der = pemToBytes("PUBLIC KEY", pem);

	if (!der) {
		throw new JwtKeyError(
			"Enter the public key as PEM text between -----BEGIN PUBLIC KEY----- and -----END PUBLIC KEY----- lines.",
		);
	}

	try {
		return await crypto.subtle.importKey("spki", der, jwtRsaKeyAlgorithm(algorithm), false, [
			"verify",
		]);
	} catch {
		throw new JwtKeyError(`The public key is not an RSA key that ${algorithm} can use.`);
	}
}
