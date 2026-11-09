import { isRecord, isStringArray } from "../../shared/records";
import { invalidRequest, overBudget } from "../services/generators/errors";
import { randomHex, sha256 } from "../utils/generation";

export const STRUDEL_PATTERN_LIMITS = {
	codeLength: 20_000,
	descriptionLength: 500,
	maxPatterns: 100,
	maxTags: 12,
	nameLength: 100,
	tagLength: 32,
};

const STORE_PREFIX = "strudel-patterns:v1:";
const ID_PATTERN = /^[0-9a-f]{16}$/;
const UNTITLED = "Untitled Pattern";

export interface StrudelPattern {
	code: string;
	createdAt: string;
	description?: string;
	id: string;
	name: string;
	tags: string[];
	updatedAt: string;
}

export interface PatternStoreEnv {
	APPLICATIONS: KVNamespace;
}

function isStoredPattern(value: unknown): value is StrudelPattern {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		typeof value.code === "string" &&
		typeof value.createdAt === "string" &&
		typeof value.updatedAt === "string" &&
		isStringArray(value.tags)
	);
}

async function storeKey(owner: string) {
	return `${STORE_PREFIX}${await sha256(owner)}`;
}

async function readPatterns(env: PatternStoreEnv, owner: string) {
	const stored: unknown = await env.APPLICATIONS.get(await storeKey(owner), "json");

	return Array.isArray(stored) ? stored.filter(isStoredPattern) : [];
}

async function writePatterns(env: PatternStoreEnv, owner: string, patterns: StrudelPattern[]) {
	await env.APPLICATIONS.put(await storeKey(owner), JSON.stringify(patterns));
}

function readTags(value: unknown) {
	if (value === undefined) {
		return [];
	}

	if (!isStringArray(value)) {
		throw invalidRequest("Send tags as a list of words.");
	}

	const tags = [...new Set(value.map((tag) => tag.trim()).filter(Boolean))];

	if (
		tags.length > STRUDEL_PATTERN_LIMITS.maxTags ||
		tags.some((tag) => tag.length > STRUDEL_PATTERN_LIMITS.tagLength)
	) {
		throw invalidRequest(
			`Use up to ${STRUDEL_PATTERN_LIMITS.maxTags} tags of ${STRUDEL_PATTERN_LIMITS.tagLength} characters or fewer.`,
		);
	}

	return tags;
}

function readPatternFields(argumentsValue: Record<string, unknown>) {
	const code = typeof argumentsValue.code === "string" ? argumentsValue.code.trim() : "";
	const name = typeof argumentsValue.name === "string" ? argumentsValue.name.trim() : "";
	const description =
		typeof argumentsValue.description === "string" ? argumentsValue.description.trim() : "";

	if (!code) {
		throw invalidRequest("A pattern needs some code.");
	}

	if (code.length > STRUDEL_PATTERN_LIMITS.codeLength) {
		throw invalidRequest(`Keep the code under ${STRUDEL_PATTERN_LIMITS.codeLength} characters.`);
	}

	if (name.length > STRUDEL_PATTERN_LIMITS.nameLength) {
		throw invalidRequest(`Keep the name under ${STRUDEL_PATTERN_LIMITS.nameLength} characters.`);
	}

	if (description.length > STRUDEL_PATTERN_LIMITS.descriptionLength) {
		throw invalidRequest(
			`Keep the description under ${STRUDEL_PATTERN_LIMITS.descriptionLength} characters.`,
		);
	}

	return {
		code,
		description: description || undefined,
		name: name || UNTITLED,
		tags: readTags(argumentsValue.tags),
	};
}

function readPatternId(value: unknown) {
	if (typeof value !== "string" || !ID_PATTERN.test(value)) {
		throw invalidRequest("That pattern id is not valid.");
	}

	return value;
}

export async function listStrudelPatterns(env: PatternStoreEnv, owner: string) {
	const patterns = await readPatterns(env, owner);

	return {
		patterns: patterns.toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
	};
}

export async function saveStrudelPattern(
	argumentsValue: Record<string, unknown>,
	env: PatternStoreEnv,
	owner: string,
) {
	const fields = readPatternFields(argumentsValue);
	const patterns = await readPatterns(env, owner);
	const now = new Date().toISOString();

	if (argumentsValue.id !== undefined) {
		const id = readPatternId(argumentsValue.id);
		const existing = patterns.find((pattern) => pattern.id === id);

		if (!existing) {
			throw invalidRequest("That pattern is not in your library any more.");
		}

		const updated = { ...existing, ...fields, updatedAt: now };

		await writePatterns(
			env,
			owner,
			patterns.map((pattern) => (pattern.id === id ? updated : pattern)),
		);

		return { pattern: updated };
	}

	if (patterns.length >= STRUDEL_PATTERN_LIMITS.maxPatterns) {
		throw overBudget(
			`Your library holds ${STRUDEL_PATTERN_LIMITS.maxPatterns} patterns. Delete one to save another.`,
		);
	}

	const created = { ...fields, createdAt: now, id: randomHex(16), updatedAt: now };

	await writePatterns(env, owner, [...patterns, created]);

	return { pattern: created };
}

export async function deleteStrudelPattern(
	argumentsValue: Record<string, unknown>,
	env: PatternStoreEnv,
	owner: string,
) {
	const id = readPatternId(argumentsValue.id);
	const patterns = await readPatterns(env, owner);

	await writePatterns(
		env,
		owner,
		patterns.filter((pattern) => pattern.id !== id),
	);

	return { deleted: id };
}
