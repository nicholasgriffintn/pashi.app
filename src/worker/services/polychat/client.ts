import { isRecord } from "../../../shared/records";
import type { ErrorCode } from "../../utils/http";

const CLIENT_ID = "pashi";
const REQUEST_TIMEOUT_MS = 10_000;
const USER_AGENT = "Pashi/1.0 (+https://pashi.app)";

export type PolychatModelTier = "low" | "medium";

export interface PolychatEnv {
	POLYCHAT_API_URL?: string;
}

export class PolychatError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code: ErrorCode,
	) {
		super(message);
		this.name = "PolychatError";
	}
}

export interface PolychatLinkStatus {
	linked: boolean;
	pro: boolean;
}

interface AuthorisationRequest {
	codeChallenge: string;
	redirectUri: string;
	state: string;
}

interface CodeExchange {
	code: string;
	codeVerifier: string;
	redirectUri: string;
}

interface CompletionRequest {
	maxTokens: number;
	messages: { content: string; role: string }[];
	responseFormat?: unknown;
	temperature: number;
	tier: PolychatModelTier;
	timeoutMs: number;
}

function apiUrl(env: PolychatEnv, path: string) {
	if (!env.POLYCHAT_API_URL) {
		throw new PolychatError("Polychat is not configured for this deployment.", 503, "unavailable");
	}

	return `${env.POLYCHAT_API_URL.replace(/\/+$/, "")}${path}`;
}

async function send(
	env: PolychatEnv,
	path: string,
	init: RequestInit & { apiKey?: string; timeoutMs?: number },
) {
	const { apiKey, timeoutMs = REQUEST_TIMEOUT_MS, ...request } = init;

	try {
		return await fetch(apiUrl(env, path), {
			...request,
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				"User-Agent": USER_AGENT,
				...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
			},
			signal: AbortSignal.timeout(timeoutMs),
		});
	} catch (error) {
		if (error instanceof PolychatError) {
			throw error;
		}

		throw new PolychatError("Polychat could not be reached.", 502, "unavailable");
	}
}

async function readBody(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}

function readErrorMessage(body: unknown) {
	if (!isRecord(body)) {
		return undefined;
	}

	if (typeof body.error === "string") {
		return body.error;
	}

	return isRecord(body.error) && typeof body.error.message === "string"
		? body.error.message
		: undefined;
}

async function requireOk(response: Response) {
	const body = await readBody(response);

	if (response.ok) {
		return body;
	}

	if (response.status === 401) {
		throw new PolychatError("Reconnect Polychat to carry on.", 401, "unauthorised");
	}

	if (response.status === 429) {
		throw new PolychatError(
			readErrorMessage(body) ?? "Polychat is rate limiting this account.",
			429,
			"rate_limited",
		);
	}

	if (response.status === 402 || response.status === 403) {
		throw new PolychatError(
			readErrorMessage(body) ?? "Polychat refused that request.",
			403,
			"forbidden",
		);
	}

	throw new PolychatError("Polychat could not complete that request.", 502, "unavailable");
}

function isHttpUrl(value: string) {
	try {
		const { protocol } = new URL(value);

		return protocol === "https:" || protocol === "http:";
	} catch {
		return false;
	}
}

export async function startAuthorisation(
	env: PolychatEnv,
	{ codeChallenge, redirectUri, state }: AuthorisationRequest,
) {
	const body = await requireOk(
		await send(env, "/auth/apps/start", {
			body: JSON.stringify({
				client_id: CLIENT_ID,
				code_challenge: codeChallenge,
				code_challenge_method: "S256",
				redirect_uri: redirectUri,
				state,
			}),
			method: "POST",
		}),
	);

	if (
		!isRecord(body) ||
		typeof body.authorisation_url !== "string" ||
		!isHttpUrl(body.authorisation_url) ||
		typeof body.expires_in !== "number"
	) {
		throw new PolychatError("Polychat returned an unexpected sign-in.", 502, "unavailable");
	}

	return { authorisationUrl: body.authorisation_url, expiresIn: body.expires_in };
}

export async function exchangeCode(
	env: PolychatEnv,
	{ code, codeVerifier, redirectUri }: CodeExchange,
) {
	const body = await requireOk(
		await send(env, "/auth/apps/token", {
			body: JSON.stringify({
				client_id: CLIENT_ID,
				code,
				code_verifier: codeVerifier,
				redirect_uri: redirectUri,
			}),
			method: "POST",
		}),
	);

	if (!isRecord(body) || typeof body.access_token !== "string") {
		throw new PolychatError("Polychat could not finish that sign-in.", 502, "unavailable");
	}

	return body.access_token;
}

export async function readLinkStatus(
	env: PolychatEnv,
	apiKey: string,
): Promise<PolychatLinkStatus> {
	const body = await requireOk(await send(env, "/pashi/link", { apiKey, method: "GET" }));

	if (!isRecord(body) || typeof body.linked !== "boolean" || typeof body.pro !== "boolean") {
		throw new PolychatError("Polychat returned an unexpected account.", 502, "unavailable");
	}

	return { linked: body.linked, pro: body.pro };
}

export async function saveToolLink(env: PolychatEnv, apiKey: string, token: string) {
	const body = await requireOk(
		await send(env, "/pashi/link", { apiKey, body: JSON.stringify({ token }), method: "PUT" }),
	);

	return isRecord(body) && typeof body.replaced_token === "string"
		? body.replaced_token
		: undefined;
}

export async function removeToolLink(env: PolychatEnv, apiKey: string) {
	await requireOk(await send(env, "/pashi/link", { apiKey, method: "DELETE" }));
}

export async function createCompletion(
	env: PolychatEnv,
	apiKey: string,
	{ maxTokens, messages, responseFormat, temperature, tier, timeoutMs }: CompletionRequest,
) {
	const body = await requireOk(
		await send(env, "/chat/completions", {
			apiKey,
			body: JSON.stringify({
				max_completion_tokens: maxTokens,
				messages,
				model_tier: tier,
				temperature,
				...(responseFormat ? { response_format: responseFormat } : {}),
			}),
			method: "POST",
			timeoutMs,
		}),
	);
	const choices = isRecord(body) ? body.choices : undefined;
	const [choice] = Array.isArray(choices) ? choices : [];
	const content = isRecord(choice) && isRecord(choice.message) ? choice.message.content : undefined;

	if (typeof content !== "string") {
		throw new PolychatError("The model returned an unexpected response.", 502, "unavailable");
	}

	return content;
}

const DECISION_TIMEOUT_MS = 60_000;

export async function createDecision(env: PolychatEnv, apiKey: string, request: unknown) {
	return requireOk(
		await send(env, "/decisions", {
			apiKey,
			body: JSON.stringify(request),
			method: "POST",
			timeoutMs: DECISION_TIMEOUT_MS,
		}),
	);
}
