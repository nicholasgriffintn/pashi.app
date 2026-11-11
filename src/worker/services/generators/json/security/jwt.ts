import {
	arrayBufferToPem,
	requireArrayBuffer,
	requireCryptoKeyPair,
} from "../../../../utils/crypto";
import {
	bytesToBase64Url,
	parseBoolean,
	parseCount,
	parseInteger,
	randomBytes,
	singleOrList,
} from "../../../../utils/generation";
import {
	type JwtAlgorithm,
	jwtRsaKeyAlgorithm,
	parseJwtAlgorithm,
	signJwtHmac,
	signJwtRsa,
} from "../../../../utils/jwt";
import type { GeneratorRequest } from "../../request";

export async function createJwtTokens(request: GeneratorRequest) {
	const algorithm = parseJwtAlgorithm(request.fields.algorithm, "HS256");
	const count = parseCount(request.fields.count ?? "", 1, 10);
	const tokens = await Promise.all(
		Array.from({ length: count }, () => createJwtToken(request, algorithm)),
	);

	return singleOrList(tokens);
}

async function createJwtToken(request: GeneratorRequest, algorithm: JwtAlgorithm) {
	const issuedAt = Math.floor(Date.now() / 1000);
	const expiresIn = parseInteger(
		request.fields.expiresIn ?? request.fields.expires_in ?? "",
		3600,
		60,
		31_536_000,
	);
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
			sign: (tokenBody) => signJwtHmac(tokenBody, secret, algorithm),
		};
	}

	const keyPair = requireCryptoKeyPair(
		await crypto.subtle.generateKey(
			{
				...jwtRsaKeyAlgorithm(algorithm),
				modulusLength: 2048,
				publicExponent: new Uint8Array([1, 0, 1]),
			},
			true,
			["sign", "verify"],
		),
	);
	const [privateKey, publicKey] = await Promise.all([
		crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
		crypto.subtle.exportKey("spki", keyPair.publicKey),
	]);

	return {
		material: {
			privateKey: arrayBufferToPem("PRIVATE KEY", requireArrayBuffer(privateKey)),
			publicKey: arrayBufferToPem("PUBLIC KEY", requireArrayBuffer(publicKey)),
		},
		sign: (tokenBody) => signJwtRsa(tokenBody, keyPair.privateKey),
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
