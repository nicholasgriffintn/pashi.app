import type { ResultStageValue } from "./result-types";

const DATABASE_NAME = "pashi";
const DATABASE_VERSION = 1;
const HISTORY_STORE = "history";
const HISTORY_LIMIT = 200;

export interface StoredResult {
	id: string;
	result: ResultStageValue;
	savedAt: string;
	toolId: string;
}

let databasePromise: Promise<IDBDatabase | undefined> | undefined;

function openDatabase(): Promise<IDBDatabase | undefined> {
	if (typeof indexedDB === "undefined") {
		return Promise.resolve(undefined);
	}

	databasePromise ??= new Promise<IDBDatabase | undefined>((resolve) => {
		let request: IDBOpenDBRequest;

		try {
			request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
		} catch {
			resolve(undefined);

			return;
		}

		request.onupgradeneeded = () => {
			const database = request.result;

			if (!database.objectStoreNames.contains(HISTORY_STORE)) {
				const store = database.createObjectStore(HISTORY_STORE, { keyPath: "id" });

				store.createIndex("savedAt", "savedAt");
				store.createIndex("toolId", "toolId");
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => resolve(undefined);
		request.onblocked = () => resolve(undefined);
	});

	return databasePromise;
}

async function withStore<T>(
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
	const database = await openDatabase();

	if (!database) {
		return undefined;
	}

	return new Promise<T | undefined>((resolve) => {
		try {
			const transaction = database.transaction(HISTORY_STORE, mode);
			const request = run(transaction.objectStore(HISTORY_STORE));

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => resolve(undefined);
			transaction.onabort = () => resolve(undefined);
		} catch {
			resolve(undefined);
		}
	});
}

export function historyEntryId(toolId: string, result: ResultStageValue) {
	return `${toolId}:${result.generatedAt ?? Date.now()}`;
}

export async function saveHistoryEntry(toolId: string, result: ResultStageValue) {
	const entry: StoredResult = {
		id: historyEntryId(toolId, result),
		result,
		savedAt: result.generatedAt ?? new Date().toISOString(),
		toolId,
	};

	await withStore("readwrite", (store) => store.put(entry));
	await pruneHistory();
}

export async function readHistory(toolId?: string): Promise<StoredResult[]> {
	const entries = await withStore<StoredResult[]>("readonly", (store) => store.getAll());

	if (!entries) {
		return [];
	}

	return entries
		.filter((entry) => (toolId ? entry.toolId === toolId : true))
		.sort((left, right) => right.savedAt.localeCompare(left.savedAt));
}

export async function clearHistory(toolId?: string) {
	if (!toolId) {
		await withStore("readwrite", (store) => store.clear());

		return;
	}

	const entries = await readHistory(toolId);

	for (const entry of entries) {
		await withStore("readwrite", (store) => store.delete(entry.id));
	}
}

async function pruneHistory() {
	const entries = await readHistory();

	for (const entry of entries.slice(HISTORY_LIMIT)) {
		await withStore("readwrite", (store) => store.delete(entry.id));
	}
}
