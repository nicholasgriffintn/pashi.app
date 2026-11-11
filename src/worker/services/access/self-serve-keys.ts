import type { ApiKeySummary } from "../../../shared/api-keys.ts";
import { isRecord } from "../../../shared/records.ts";
import { createRandomToken } from "../../utils/crypto.ts";
import { sha256 } from "../../utils/generation.ts";
import {
	API_KEY_PREFIX,
	APPLICATION_KEY_PREFIX,
	type ApiKeyEnv,
	type Application,
} from "./api-keys.ts";

export const SELF_SERVE_KEY_LIMIT = 3;
export const SELF_SERVE_KEY_NAME_LENGTH = 60;

const OWNER_INDEX_PREFIX = "api-key-owners:v1:";
const KEY_PREFIX = "pashi_";
const KEY_RANDOM_LENGTH = 40;
const KEY_HINT_LENGTH = 4;

interface OwnerIndexEntry extends ApiKeySummary {
	digest: string;
}

export class SelfServeKeyError extends Error {
	readonly status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.status = status;
	}
}

async function ownerIndexKey(owner: string) {
	return `${OWNER_INDEX_PREFIX}${await sha256(owner)}`;
}

function isOwnerIndexEntry(value: unknown): value is OwnerIndexEntry {
	return (
		isRecord(value) &&
		["createdAt", "digest", "hint", "id", "name"].every((field) => typeof value[field] === "string")
	);
}

async function readOwnerIndex(env: ApiKeyEnv, owner: string): Promise<OwnerIndexEntry[]> {
	const value: unknown = await env.APPLICATIONS.get(await ownerIndexKey(owner), "json");

	return Array.isArray(value) ? value.filter(isOwnerIndexEntry) : [];
}

async function writeOwnerIndex(env: ApiKeyEnv, owner: string, entries: OwnerIndexEntry[]) {
	await env.APPLICATIONS.put(await ownerIndexKey(owner), JSON.stringify(entries));
}

function toSummary({ createdAt, hint, id, name }: OwnerIndexEntry): ApiKeySummary {
	return { createdAt, hint, id, name };
}

function cleanName(value: unknown) {
	const name = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

	if (!name) {
		return "API key";
	}

	if (name.length > SELF_SERVE_KEY_NAME_LENGTH) {
		throw new SelfServeKeyError(
			`Key names can be up to ${SELF_SERVE_KEY_NAME_LENGTH} characters.`,
			422,
		);
	}

	return name;
}

export async function listSelfServeKeys(env: ApiKeyEnv, owner: string) {
	return (await readOwnerIndex(env, owner)).map(toSummary);
}

export async function createSelfServeKey(env: ApiKeyEnv, owner: string, requestedName: unknown) {
	const name = cleanName(requestedName);
	const entries = await readOwnerIndex(env, owner);

	if (entries.length >= SELF_SERVE_KEY_LIMIT) {
		throw new SelfServeKeyError(
			`You can have up to ${SELF_SERVE_KEY_LIMIT} keys. Revoke one to create another.`,
			422,
		);
	}

	const key = `${KEY_PREFIX}${createRandomToken("alphanumeric", KEY_RANDOM_LENGTH)}`;
	const digest = await sha256(key);
	const id = `key-${createRandomToken("hex", 16).toLowerCase()}`;
	const createdAt = new Date().toISOString();
	const application: Application = { enabled: true, id, name, owner, tier: "free" };
	const entry: OwnerIndexEntry = {
		createdAt,
		digest,
		hint: key.slice(-KEY_HINT_LENGTH),
		id,
		name,
	};

	await env.APPLICATIONS.put(`${APPLICATION_KEY_PREFIX}${id}`, JSON.stringify(application));
	await env.APPLICATIONS.put(
		`${API_KEY_PREFIX}${digest}`,
		JSON.stringify({ applicationId: id, enabled: true }),
	);
	await writeOwnerIndex(env, owner, [...entries, entry]);

	return { key, summary: toSummary(entry) };
}

export async function revokeSelfServeKey(env: ApiKeyEnv, owner: string, id: string) {
	const entries = await readOwnerIndex(env, owner);
	const entry = entries.find((item) => item.id === id);

	if (!entry) {
		throw new SelfServeKeyError("That key does not exist.", 404);
	}

	await env.APPLICATIONS.delete(`${API_KEY_PREFIX}${entry.digest}`);
	await env.APPLICATIONS.delete(`${APPLICATION_KEY_PREFIX}${entry.id}`);
	await writeOwnerIndex(
		env,
		owner,
		entries.filter((item) => item.id !== id),
	);
}
