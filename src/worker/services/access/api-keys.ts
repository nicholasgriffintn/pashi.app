import { sha256 } from "../../utils/generation.ts";

export const APPLICATION_KEY_PREFIX = "applications:v1:";
export const API_KEY_PREFIX = "api-keys:v1:";
const API_KEY_PATTERN = /^[A-Za-z0-9._~-]{32,256}$/;
const APPLICATION_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export type ApplicationTier = "free" | "full";

export interface Application {
	enabled: boolean;
	id: string;
	name: string;
	owner?: string;
	tier: ApplicationTier;
}

interface ApiKeyRecord {
	applicationId: string;
	enabled: boolean;
}

export interface ApiKeyEnv {
	APPLICATIONS: KVNamespace;
}

export type ApplicationAuthentication =
	| { status: "absent" | "invalid" | "unavailable" }
	| { application: Application; status: "authenticated" };

export async function authenticateApplication(
	request: Request,
	env: Partial<ApiKeyEnv>,
): Promise<ApplicationAuthentication> {
	const credential = readApiKey(request.headers);

	if (credential.status !== "present") {
		return { status: credential.status };
	}

	if (!env.APPLICATIONS) {
		return { status: "unavailable" };
	}

	const digest = await sha256(credential.value);
	const apiKeyValue = await readKvValue(env.APPLICATIONS, `${API_KEY_PREFIX}${digest}`);

	if (apiKeyValue.status !== "found") {
		return apiKeyValue.status === "unavailable" ? { status: "unavailable" } : { status: "invalid" };
	}

	const apiKey = parseApiKeyRecord(apiKeyValue.value);

	if (!apiKey?.enabled) {
		return { status: "invalid" };
	}

	const applicationValue = await readKvValue(
		env.APPLICATIONS,
		`${APPLICATION_KEY_PREFIX}${apiKey.applicationId}`,
	);

	if (applicationValue.status !== "found") {
		return applicationValue.status === "unavailable"
			? { status: "unavailable" }
			: { status: "invalid" };
	}

	const application = parseApplication(applicationValue.value);

	if (!application?.enabled || application.id !== apiKey.applicationId) {
		return { status: "invalid" };
	}

	return { application, status: "authenticated" };
}

function readApiKey(
	headers: Headers,
): { status: "absent" | "invalid" } | { status: "present"; value: string } {
	const authorization = headers.get("authorization");
	const headerKey = headers.get("x-api-key")?.trim();
	let bearerKey: string | undefined;

	if (authorization) {
		const match = authorization.match(/^\s*Bearer\s+(\S+)\s*$/i);

		if (match) {
			bearerKey = match[1];
		} else if (/^\s*Bearer\b/i.test(authorization)) {
			return { status: "invalid" };
		}
	}

	if (bearerKey && headerKey && bearerKey !== headerKey) {
		return { status: "invalid" };
	}

	const value = bearerKey ?? headerKey;

	if (!value) {
		return { status: "absent" };
	}

	return API_KEY_PATTERN.test(value) ? { status: "present", value } : { status: "invalid" };
}

async function readKvValue(namespace: KVNamespace, key: string) {
	try {
		const value = await namespace.get(key);

		return value === null ? { status: "missing" as const } : { status: "found" as const, value };
	} catch {
		return { status: "unavailable" as const };
	}
}

function parseApiKeyRecord(value: string): ApiKeyRecord | undefined {
	const record = parseJsonRecord(value);

	if (
		!record ||
		typeof record.applicationId !== "string" ||
		!APPLICATION_ID_PATTERN.test(record.applicationId) ||
		typeof record.enabled !== "boolean"
	) {
		return undefined;
	}

	return {
		applicationId: record.applicationId,
		enabled: record.enabled,
	};
}

function parseApplication(value: string): Application | undefined {
	const record = parseJsonRecord(value);

	if (
		!record ||
		typeof record.id !== "string" ||
		!APPLICATION_ID_PATTERN.test(record.id) ||
		typeof record.name !== "string" ||
		record.name.trim().length === 0 ||
		record.name.length > 100 ||
		typeof record.enabled !== "boolean"
	) {
		return undefined;
	}

	return {
		enabled: record.enabled,
		id: record.id,
		name: record.name,
		...(typeof record.owner === "string" ? { owner: record.owner } : {}),
		tier: record.tier === "free" ? "free" : "full",
	};
}

function parseJsonRecord(value: string): Record<string, unknown> | undefined {
	try {
		const parsed: unknown = JSON.parse(value);

		return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: undefined;
	} catch {
		return undefined;
	}
}
