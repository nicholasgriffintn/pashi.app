import {
	isPolisRecording,
	POLIS_SHARE_MAX_BYTES,
	POLIS_SHARE_TOKEN_PATTERN,
	type PolisRecording,
} from "../../shared/polis";
import { isRecord } from "../../shared/records";
import { invalidRequest, overBudget } from "../services/generators/errors";
import { randomHex, sha256 } from "../utils/generation";

export const POLIS_TOWN_LIMITS = { maxTowns: 20 };

const TOWNS_PREFIX = "polis-towns:v1:";
const SHARE_PREFIX = "polis-shares:v1:";
const TOO_BIG = "This town has too much history to share. Share an earlier save instead.";

export interface TownStoreEnv {
	APPLICATIONS: KVNamespace;
}

export interface SavedTownSummary {
	day: number;
	id: string;
	name: string;
	population: number;
	savedAt: number;
	shareToken?: string;
}

function isSummary(value: unknown): value is SavedTownSummary {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		typeof value.population === "number" &&
		typeof value.day === "number" &&
		typeof value.savedAt === "number"
	);
}

async function ownerKey(owner: string) {
	return `${TOWNS_PREFIX}${await sha256(owner)}`;
}

async function readIndex(env: TownStoreEnv, owner: string) {
	const stored: unknown = await env.APPLICATIONS.get(`${await ownerKey(owner)}:index`, "json");

	return Array.isArray(stored) ? stored.filter(isSummary) : [];
}

async function writeIndex(env: TownStoreEnv, owner: string, towns: SavedTownSummary[]) {
	await env.APPLICATIONS.put(`${await ownerKey(owner)}:index`, JSON.stringify(towns));
}

function readRecording(value: unknown) {
	if (!isPolisRecording(value)) {
		throw invalidRequest("That is not a Polis recording");
	}

	const body = JSON.stringify(value);

	if (new TextEncoder().encode(body).byteLength > POLIS_SHARE_MAX_BYTES) {
		throw overBudget(TOO_BIG);
	}

	return { body, recording: value };
}

function readId(value: unknown) {
	if (typeof value !== "string" || !value || value.length > 64) {
		throw invalidRequest("That town id is not valid.");
	}

	return value;
}

function summarise(recording: PolisRecording, shareToken?: string): SavedTownSummary {
	return {
		day: recording.day,
		id: recording.id,
		name: recording.name,
		population: recording.population,
		savedAt: recording.savedAt,
		...(shareToken ? { shareToken } : {}),
	};
}

export async function listPolisTowns(env: TownStoreEnv, owner: string) {
	const towns = await readIndex(env, owner);

	return { towns: towns.toSorted((left, right) => right.savedAt - left.savedAt) };
}

export async function getPolisTown(
	argumentsValue: Record<string, unknown>,
	env: TownStoreEnv,
	owner: string,
) {
	const id = readId(argumentsValue.id);
	const stored: unknown = await env.APPLICATIONS.get(`${await ownerKey(owner)}:${id}`, "json");

	if (!isPolisRecording(stored)) {
		throw invalidRequest("That town is not saved any more.");
	}

	return { recording: stored };
}

export async function savePolisTown(
	argumentsValue: Record<string, unknown>,
	env: TownStoreEnv,
	owner: string,
) {
	const { body, recording } = readRecording(argumentsValue.recording);
	const towns = await readIndex(env, owner);
	const existing = towns.find((town) => town.id === recording.id);

	if (!existing && towns.length >= POLIS_TOWN_LIMITS.maxTowns) {
		throw overBudget(
			`You can keep ${POLIS_TOWN_LIMITS.maxTowns} towns. Delete one to save another.`,
		);
	}

	await env.APPLICATIONS.put(`${await ownerKey(owner)}:${recording.id}`, body);
	await writeIndex(env, owner, [
		summarise(recording, existing?.shareToken),
		...towns.filter((town) => town.id !== recording.id),
	]);

	return { town: summarise(recording, existing?.shareToken) };
}

export async function deletePolisTown(
	argumentsValue: Record<string, unknown>,
	env: TownStoreEnv,
	owner: string,
) {
	const id = readId(argumentsValue.id);
	const towns = await readIndex(env, owner);
	const town = towns.find((entry) => entry.id === id);

	if (town?.shareToken) {
		await env.APPLICATIONS.delete(`${SHARE_PREFIX}${town.shareToken}`);
	}

	await env.APPLICATIONS.delete(`${await ownerKey(owner)}:${id}`);
	await writeIndex(
		env,
		owner,
		towns.filter((entry) => entry.id !== id),
	);

	return { deleted: id };
}

export async function sharePolisTown(
	argumentsValue: Record<string, unknown>,
	env: TownStoreEnv,
	owner: string,
) {
	const { body, recording } = readRecording(argumentsValue.recording);
	const towns = await readIndex(env, owner);
	const existing = towns.find((town) => town.id === recording.id);
	const token = existing?.shareToken ?? randomHex(32);

	await env.APPLICATIONS.put(`${SHARE_PREFIX}${token}`, body);
	await env.APPLICATIONS.put(`${await ownerKey(owner)}:${recording.id}`, body);
	await writeIndex(env, owner, [
		summarise(recording, token),
		...towns.filter((town) => town.id !== recording.id),
	]);

	return { token };
}

export async function stopSharingPolisTown(
	argumentsValue: Record<string, unknown>,
	env: TownStoreEnv,
	owner: string,
) {
	const id = readId(argumentsValue.id);
	const towns = await readIndex(env, owner);
	const town = towns.find((entry) => entry.id === id);

	if (town?.shareToken) {
		await env.APPLICATIONS.delete(`${SHARE_PREFIX}${town.shareToken}`);
	}

	await writeIndex(
		env,
		owner,
		towns.map(({ shareToken, ...entry }) => (entry.id === id ? entry : { ...entry, shareToken })),
	);

	return { token: town?.shareToken ?? null };
}

export async function readSharedPolisTown(env: TownStoreEnv, token: string) {
	if (!POLIS_SHARE_TOKEN_PATTERN.test(token)) {
		return undefined;
	}

	const stored: unknown = await env.APPLICATIONS.get(`${SHARE_PREFIX}${token}`, "json");

	return isPolisRecording(stored) ? stored : undefined;
}
