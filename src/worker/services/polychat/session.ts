import { parse as parseCookies } from "hono/utils/cookie";

import type { PolychatConnectOutcome, PolychatSessionStatus } from "../../../shared/polychat";
import { isRecord } from "../../../shared/records";
import { randomHex, sha256, sha256Base64Url } from "../../utils/generation";
import { deleteSealedRecord, readSealedRecord, writeSealedRecord } from "../../utils/sealed-record";
import {
	exchangeCode,
	PolychatError,
	readLinkStatus,
	removeToolLink,
	saveToolLink,
	startAuthorisation,
	type PolychatEnv,
} from "./client";

const CALLBACK_PATH = "/api/polychat/callback";
const CONNECT_COOKIE_NAME = "pashi_polychat_connect";
const CONNECT_RECORD_PREFIX = "polychat-connects:v1:";
const CROSS_ORIGIN_FETCH_SITES = new Set(["cross-site", "same-site"]);
const LINK_RECORD_PREFIX = "polychat-links:v1:";
const LINK_TOKEN_PREFIX = "pcl_";
const MINIMUM_KV_TTL_SECONDS = 60;
const PRO_STATUS_PREFIX = "polychat-pro:v1:";
const PRO_STATUS_TTL_SECONDS = 300;
const SESSION_COOKIE_NAME = "pashi_polychat";
const SESSION_RECORD_PREFIX = "polychat-sessions:v1:";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const TOKEN_HEX_LENGTH = 64;

export interface PolychatSessionEnv extends PolychatEnv {
	APPLICATIONS: KVNamespace;
}

interface ConnectRecord {
	codeVerifier: string;
	state: string;
}

interface ConnectedRecord {
	apiKey: string;
	linkToken: string;
}

export interface PolychatCredential {
	apiKey: string;
	subjectId: string;
}

function readSealed(env: PolychatSessionEnv, prefix: string, token: string) {
	return readSealedRecord(env.APPLICATIONS, prefix, token);
}

function writeSealed(
	env: PolychatSessionEnv,
	prefix: string,
	token: string,
	value: ConnectRecord | ConnectedRecord,
	expirationTtl?: number,
) {
	return writeSealedRecord(env.APPLICATIONS, prefix, token, value, expirationTtl);
}

function deleteSealed(env: PolychatSessionEnv, prefix: string, token: string) {
	return deleteSealedRecord(env.APPLICATIONS, prefix, token);
}

async function readConnected(env: PolychatSessionEnv, prefix: string, token: string) {
	const value = await readSealed(env, prefix, token);

	return isRecord(value) && typeof value.apiKey === "string" && typeof value.linkToken === "string"
		? { apiKey: value.apiKey, linkToken: value.linkToken }
		: undefined;
}

async function readConnect(env: PolychatSessionEnv, token: string) {
	const value = await readSealed(env, CONNECT_RECORD_PREFIX, token);

	return isRecord(value) &&
		typeof value.codeVerifier === "string" &&
		typeof value.state === "string"
		? { codeVerifier: value.codeVerifier, state: value.state }
		: undefined;
}

function isSecure(request: Request) {
	return new URL(request.url).protocol === "https:";
}

function cookieName(request: Request, name: string) {
	return isSecure(request) ? `__Host-${name}` : name;
}

function readCookie(request: Request, name: string) {
	return parseCookies(request.headers.get("cookie") ?? "")[cookieName(request, name)];
}

function buildCookie(
	request: Request,
	name: string,
	value: string,
	maxAge: number,
	sameSite: "Lax" | "Strict",
) {
	const secure = isSecure(request) ? "; Secure" : "";

	return `${cookieName(request, name)}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=${sameSite}${secure}`;
}

function readSessionToken(request: Request) {
	return CROSS_ORIGIN_FETCH_SITES.has(request.headers.get("sec-fetch-site") ?? "")
		? undefined
		: readCookie(request, SESSION_COOKIE_NAME);
}

function readLinkToken(request: Request) {
	const match = request.headers.get("authorization")?.match(/^\s*Bearer\s+(\S+)\s*$/i);

	return match?.[1]?.startsWith(LINK_TOKEN_PREFIX) ? match[1] : undefined;
}

export function clearedSessionCookie(request: Request) {
	return buildCookie(request, SESSION_COOKIE_NAME, "", 0, "Strict");
}

export async function isPolychatPro(env: PolychatSessionEnv, apiKey: string) {
	const key = `${PRO_STATUS_PREFIX}${await sha256(apiKey)}`;
	const cached = await env.APPLICATIONS.get(key);

	if (cached) {
		return cached === "pro";
	}

	const { pro } = await readLinkStatus(env, apiKey);

	await env.APPLICATIONS.put(key, pro ? "pro" : "free", {
		expirationTtl: PRO_STATUS_TTL_SECONDS,
	});

	return pro;
}

export async function resolvePolychatCredential(
	request: Request,
	env: PolychatSessionEnv,
): Promise<PolychatCredential | undefined> {
	const linkToken = readLinkToken(request);
	const sessionToken = linkToken ? undefined : readSessionToken(request);
	const record = linkToken
		? await readConnected(env, LINK_RECORD_PREFIX, linkToken)
		: sessionToken
			? await readConnected(env, SESSION_RECORD_PREFIX, sessionToken)
			: undefined;

	if (!record) {
		return undefined;
	}

	return {
		apiKey: record.apiKey,
		subjectId: `polychat-${(await sha256(record.apiKey)).slice(0, 32)}`,
	};
}

function callbackUrl(request: Request) {
	return `${new URL(request.url).origin}${CALLBACK_PATH}`;
}

export async function startConnection(request: Request, env: PolychatSessionEnv) {
	const codeVerifier = randomHex(TOKEN_HEX_LENGTH);
	const connectToken = randomHex(TOKEN_HEX_LENGTH);
	const state = randomHex(TOKEN_HEX_LENGTH);
	const { authorisationUrl, expiresIn } = await startAuthorisation(env, {
		codeChallenge: await sha256Base64Url(codeVerifier),
		redirectUri: callbackUrl(request),
		state,
	});

	await writeSealed(
		env,
		CONNECT_RECORD_PREFIX,
		connectToken,
		{ codeVerifier, state },
		Math.max(MINIMUM_KV_TTL_SECONDS, expiresIn),
	);

	return {
		authorisationUrl,
		cookie: buildCookie(request, CONNECT_COOKIE_NAME, connectToken, expiresIn, "Lax"),
	};
}

async function establishConnection(env: PolychatSessionEnv, apiKey: string) {
	const linkToken = `${LINK_TOKEN_PREFIX}${randomHex(TOKEN_HEX_LENGTH)}`;
	const sessionToken = randomHex(TOKEN_HEX_LENGTH);
	const record: ConnectedRecord = { apiKey, linkToken };

	await writeSealed(env, LINK_RECORD_PREFIX, linkToken, record);

	try {
		const replacedToken = await saveToolLink(env, apiKey, linkToken);

		if (replacedToken) {
			await deleteSealed(env, LINK_RECORD_PREFIX, replacedToken);
		}
	} catch (error) {
		await deleteSealed(env, LINK_RECORD_PREFIX, linkToken);
		await removeToolLink(env, apiKey).catch(() => undefined);
		throw error;
	}

	await writeSealed(env, SESSION_RECORD_PREFIX, sessionToken, record, SESSION_TTL_SECONDS);

	return sessionToken;
}

export async function finishConnection(
	request: Request,
	env: PolychatSessionEnv,
): Promise<{ cookies: string[]; outcome: PolychatConnectOutcome }> {
	const params = new URL(request.url).searchParams;
	const connectToken = readCookie(request, CONNECT_COOKIE_NAME);
	const pending = connectToken ? await readConnect(env, connectToken) : undefined;

	if (!connectToken || !pending || params.get("state") !== pending.state) {
		return { cookies: [], outcome: "expired" };
	}

	await deleteSealed(env, CONNECT_RECORD_PREFIX, connectToken);

	const clearConnect = buildCookie(request, CONNECT_COOKIE_NAME, "", 0, "Lax");
	const code = params.get("code");

	if (!code) {
		return {
			cookies: [clearConnect],
			outcome: params.get("error") === "access_denied" ? "denied" : "failed",
		};
	}

	try {
		const apiKey = await exchangeCode(env, {
			code,
			codeVerifier: pending.codeVerifier,
			redirectUri: callbackUrl(request),
		});
		const sessionToken = await establishConnection(env, apiKey);

		return {
			cookies: [
				clearConnect,
				buildCookie(request, SESSION_COOKIE_NAME, sessionToken, SESSION_TTL_SECONDS, "Strict"),
			],
			outcome: "connected",
		};
	} catch (error) {
		if (error instanceof PolychatError) {
			return { cookies: [clearConnect], outcome: "failed" };
		}

		throw error;
	}
}

async function forgetConnection(
	env: PolychatSessionEnv,
	sessionToken: string,
	record: ConnectedRecord,
) {
	await deleteSealed(env, LINK_RECORD_PREFIX, record.linkToken);
	await deleteSealed(env, SESSION_RECORD_PREFIX, sessionToken);
}

export async function readSessionStatus(
	request: Request,
	env: PolychatSessionEnv,
): Promise<{ clearCookie?: boolean; status: PolychatSessionStatus }> {
	const token = readSessionToken(request);
	const record = token ? await readConnected(env, SESSION_RECORD_PREFIX, token) : undefined;

	if (!token || !record) {
		return { clearCookie: Boolean(token), status: { status: "disconnected" } };
	}

	try {
		return { status: { pro: await isPolychatPro(env, record.apiKey), status: "connected" } };
	} catch (error) {
		if (error instanceof PolychatError && error.status === 401) {
			await forgetConnection(env, token, record);

			return { clearCookie: true, status: { status: "disconnected" } };
		}

		throw error;
	}
}

export async function endConnection(request: Request, env: PolychatSessionEnv) {
	const token = readSessionToken(request);
	const record = token ? await readConnected(env, SESSION_RECORD_PREFIX, token) : undefined;

	if (!token || !record) {
		return;
	}

	await removeToolLink(env, record.apiKey).catch(() => undefined);
	await forgetConnection(env, token, record);
}
