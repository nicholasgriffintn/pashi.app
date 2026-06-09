import type { GeneratorRequest } from "../../request";
import {
	bytesToBase64Url,
	parseBoolean,
	parseChoice,
	parseCount,
	parseInteger,
	randomBytes,
	singleOrList,
} from "../../../../utils/generation";
import { arrayBufferToPem, requireArrayBuffer, requireCryptoKeyPair } from "../../../../utils/crypto";

const JWT_ALGORITHMS = ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"] as const;

type JwtAlgorithm = (typeof JWT_ALGORITHMS)[number];

export async function createJwtTokens(request: GeneratorRequest) {
	const algorithm = parseChoice(request.fields.algorithm, JWT_ALGORITHMS, "HS256");
	const count = parseCount(request.fields.count ?? "", 1, 10);
	const tokens = await Promise.all(
		Array.from({ length: count }, () => createJwtToken(request, algorithm)),
	);

	return singleOrList(tokens);
}

async function createJwtToken(request: GeneratorRequest, algorithm: JwtAlgorithm) {
	const issuedAt = Math.floor(Date.now() / 1000);
	const expiresIn = parseInteger(request.fields.expiresIn ?? request.fields.expires_in ?? "", 3600, 60, 31_536_000);
	const includeNbf = parseBoolean(request.fields.includeNbf ?? request.fields.include_nbf, false);
	const includeJti = parseBoolean(request.fields.includeJti ?? request.fields.include_jti, true);
	const header = { alg: algorithm, typ: "JWT" };
	const payload = {
		...customClaims(request.fields.customClaims ?? request.fields.custom_claims),
		aud: request.fields.audience?.trim() || "https://api.example.com",
		exp: issuedAt + expiresIn,
		iat: issuedAt,
		iss: request.fields.issuer?.trim() || "pashi",
		...(includeJti ? { jti: crypto.randomUUID() } : {}),
		...(includeNbf ? { nbf: issuedAt } : {}),
		sub: request.fields.subject?.trim() || "user_123",
	};
	const tokenBody = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
	const signer = await createSigner(algorithm);
	const signature = await signer.sign(tokenBody);

	return {
		algorithm,
		expiresIn: `${expiresIn}`,
		header: JSON.stringify(header),
		payload: JSON.stringify(payload),
		signature,
		token: `${tokenBody}.${signature}`,
		...signer.material,
	};
}

async function createSigner(algorithm: JwtAlgorithm): Promise<{
	material: Record<string, string>;
	sign: (tokenBody: string) => Promise<string>;
}> {
	if (algorithm.startsWith("HS")) {
		const secret = randomBytes(32);
		return {
			material: {
				secret: bytesToBase64Url(secret),
			},
			sign: (tokenBody) => signHmac(tokenBody, secret, algorithm),
		};
	}

	const keyPair = requireCryptoKeyPair(await crypto.subtle.generateKey(
		{
			hash: hashNameFor(algorithm),
			modulusLength: 2048,
			name: "RSASSA-PKCS1-v1_5",
			publicExponent: new Uint8Array([1, 0, 1]),
		},
		true,
		["sign", "verify"],
	));
	const [privateKey, publicKey] = await Promise.all([
		crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
		crypto.subtle.exportKey("spki", keyPair.publicKey),
	]);

	return {
		material: {
			privateKey: arrayBufferToPem("PRIVATE KEY", requireArrayBuffer(privateKey)),
			publicKey: arrayBufferToPem("PUBLIC KEY", requireArrayBuffer(publicKey)),
		},
		sign: (tokenBody) => signRsa(tokenBody, keyPair.privateKey),
	};
}

function customClaims(value: string | undefined) {
	if (!value?.trim()) {
		return {};
	}

	try {
		const parsed = JSON.parse(value) as unknown;
		return isPlainClaimObject(parsed) ? sanitizeClaimObject(parsed) : {};
	} catch {
		return {};
	}
}

function isPlainClaimObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeClaimObject(value: Record<string, unknown>) {
	const claims: Record<string, string | number | boolean> = {};

	for (const [key, entry] of Object.entries(value)) {
		if (!/^[a-zA-Z0-9_.:-]{1,64}$/.test(key)) {
			continue;
		}
		if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
			claims[key] = entry;
		}
	}

	return claims;
}

function base64UrlJson(value: unknown) {
	return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

async function signHmac(value: string, secret: Uint8Array, algorithm: JwtAlgorithm) {
	const key = await crypto.subtle.importKey(
		"raw",
		secret,
		{ hash: hashNameFor(algorithm), name: "HMAC" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
	return bytesToBase64Url(new Uint8Array(signature));
}

async function signRsa(value: string, privateKey: CryptoKey) {
	const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(value));
	return bytesToBase64Url(new Uint8Array(signature));
}

function hashNameFor(algorithm: JwtAlgorithm) {
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
