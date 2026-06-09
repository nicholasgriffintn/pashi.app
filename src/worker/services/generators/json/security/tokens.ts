import type { GeneratorRequest } from "../../request";
import {
	parseBoolean,
	parseChoice,
	parseCount,
	parseInteger,
	singleOrList,
} from "../../../../utils/generation";
import { createRandomToken } from "../../../../utils/crypto";

const OAUTH_TOKEN_FORMATS = ["base64", "base64url", "hex", "alphanumeric"] as const;
const OAUTH_TOKEN_TYPES = ["bearer", "mac", "basic"] as const;
const SALT_ENCODINGS = ["base64", "base64url", "hex", "alphanumeric"] as const;
const WEBHOOK_SECRET_ALGORITHMS = ["sha256", "sha384", "sha512"] as const;
const WEBHOOK_SECRET_FORMATS = ["hex", "base64", "alphanumeric"] as const;

export function createOauthTokens(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 10);
	const format = parseChoice(request.fields.format, OAUTH_TOKEN_FORMATS, "base64url");
	const tokenType = parseChoice(request.fields.tokenType ?? request.fields.token_type, OAUTH_TOKEN_TYPES, "bearer");
	const accessTokenLength = parseInteger(
		request.fields.accessTokenLength ?? request.fields.access_token_length ?? request.fields.length ?? request.input,
		64,
		32,
		256,
	);
	const refreshTokenLength = parseInteger(
		request.fields.refreshTokenLength ?? request.fields.refresh_token_length ?? "",
		128,
		32,
		256,
	);
	const expiresIn = parseInteger(request.fields.expiresIn ?? request.fields.expires_in ?? "", 3600, 300, 86_400);
	const scope = sanitizeScope(request.fields.scope ?? "read write");
	const includeRefresh = parseBoolean(request.fields.includeRefresh ?? request.fields.include_refresh, true);

	return singleOrList(
		Array.from({ length: count }, () => {
			const token = {
				accessToken: createFormattedToken(format, accessTokenLength),
				expiresIn: `${expiresIn}`,
				scope,
				tokenType: formatTokenType(tokenType),
			};

			if (!includeRefresh) {
				return token;
			}

			return {
				...token,
				refreshToken: createFormattedToken(format, refreshTokenLength),
			};
		}),
	);
}

export function createSalts(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 25);
	const length = parseInteger(request.fields.length ?? request.input, 32, 8, 128);
	const encoding = parseChoice(request.fields.encoding, SALT_ENCODINGS, "base64");
	const includeLength = parseBoolean(request.fields.includeLength ?? request.fields.include_length, false);
	return singleOrList(
		Array.from({ length: count }, () => {
			const salt = {
				encoding,
				salt: createFormattedToken(encoding, length),
			};

			return includeLength ? { ...salt, length: `${length}` } : salt;
		}),
	);
}

export async function createWebhookSecrets(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 10);
	const length = parseInteger(request.fields.length ?? request.input, 32, 16, 64);
	const algorithm = parseChoice(request.fields.algorithm, WEBHOOK_SECRET_ALGORITHMS, "sha256");
	const format = parseChoice(request.fields.format, WEBHOOK_SECRET_FORMATS, "hex");
	const includeExample = parseBoolean(request.fields.includeExample ?? request.fields.include_example, true);
	const includeTimestamp = parseBoolean(request.fields.includeTimestamp ?? request.fields.include_timestamp, false);

	const secrets = await Promise.all(
		Array.from({ length: count }, async () => {
			const secret = createFormattedToken(format, length);
			const webhookSecret = {
				algorithm: hmacLabel(algorithm),
				format,
				secret,
			};

			if (!includeExample) {
				return webhookSecret;
			}

			const timestamp = `${Math.floor(Date.now() / 1000)}`;
			const payload = JSON.stringify({
				data: {
					object: "checkout.session",
					status: "complete",
				},
				event: "payment.completed",
				id: `evt_${createRandomToken("alphanumeric", 16)}`,
			});
			const signedPayload = includeTimestamp ? `${timestamp}.${payload}` : payload;
			const signature = await signHmacHex(signedPayload, secret, algorithm);

			return {
				...webhookSecret,
				payload,
				signature: `${algorithm}=${signature}`,
				signatureHeader: `X-Webhook-Signature: ${algorithm}=${signature}`,
				...(includeTimestamp ? { timestamp, timestampHeader: `X-Webhook-Timestamp: ${timestamp}` } : {}),
			};
		}),
	);

	return singleOrList(secrets);
}

function createFormattedToken(format: "alphanumeric" | "base64" | "base64url" | "hex", length: number) {
	const token = createRandomToken(format, length);
	return format === "hex" ? token.toLowerCase() : token;
}

function formatTokenType(tokenType: "basic" | "bearer" | "mac") {
	switch (tokenType) {
		case "basic":
			return "Basic";
		case "bearer":
			return "Bearer";
		case "mac":
			return "MAC";
	}
}

function hmacHashName(algorithm: "sha256" | "sha384" | "sha512") {
	switch (algorithm) {
		case "sha256":
			return "SHA-256";
		case "sha384":
			return "SHA-384";
		case "sha512":
			return "SHA-512";
	}
}

function hmacLabel(algorithm: "sha256" | "sha384" | "sha512") {
	return `HMAC-${hmacHashName(algorithm)}`;
}

async function signHmacHex(value: string, secret: string, algorithm: "sha256" | "sha384" | "sha512") {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ hash: hmacHashName(algorithm), name: "HMAC" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
	return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sanitizeScope(value: string) {
	return value
		.split(/\s+/)
		.map((scope) => scope.replace(/[^a-zA-Z0-9:._/-]/g, ""))
		.filter(Boolean)
		.join(" ")
		.slice(0, 240);
}
