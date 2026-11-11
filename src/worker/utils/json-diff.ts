import { isRecord } from "../../shared/records.ts";
import { assertJsonWithinBudget, createJsonOutputBudget } from "./json-budget.ts";
import { JSON_PATH_ROOT, jsonPathIndex, jsonPathKey } from "./json-path.ts";

export const JSON_DIFF_LIMITS = { depth: 64, nodes: 20_000 } as const;

export interface JsonDiffEntry {
	path: string;
	value: unknown;
}

export interface JsonDiffChange {
	from: unknown;
	path: string;
	to: unknown;
}

export interface JsonDiff {
	added: JsonDiffEntry[];
	changed: JsonDiffChange[];
	removed: JsonDiffEntry[];
	unchanged: boolean;
}

export function diffJson(left: unknown, right: unknown): JsonDiff {
	assertJsonWithinBudget([left, right], {
		maxDepth: JSON_DIFF_LIMITS.depth,
		maxNodes: JSON_DIFF_LIMITS.nodes,
	});

	const diff: JsonDiff = { added: [], changed: [], removed: [], unchanged: true };

	compareJson(left, right, JSON_PATH_ROOT, diff);
	assertDiffWithinOutputBudget(diff);
	diff.unchanged = diff.added.length + diff.changed.length + diff.removed.length === 0;

	return diff;
}

function assertDiffWithinOutputBudget(diff: JsonDiff) {
	const spend = createJsonOutputBudget();

	for (const entry of [...diff.added, ...diff.removed]) {
		spend(entry.path, entry.value);
	}

	for (const change of diff.changed) {
		spend(change.path, change.from, change.to);
	}
}

function compareJson(left: unknown, right: unknown, path: string, diff: JsonDiff) {
	if (Array.isArray(left) && Array.isArray(right)) {
		compareArrays(left, right, path, diff);

		return;
	}

	if (isRecord(left) && isRecord(right)) {
		compareRecords(left, right, path, diff);

		return;
	}

	if (left !== right) {
		diff.changed.push({ from: left, path, to: right });
	}
}

function compareArrays(
	left: readonly unknown[],
	right: readonly unknown[],
	path: string,
	diff: JsonDiff,
) {
	const length = Math.max(left.length, right.length);

	for (let index = 0; index < length; index += 1) {
		const itemPath = jsonPathIndex(path, index);

		if (index >= left.length) {
			diff.added.push({ path: itemPath, value: right[index] });
		} else if (index >= right.length) {
			diff.removed.push({ path: itemPath, value: left[index] });
		} else {
			compareJson(left[index], right[index], itemPath, diff);
		}
	}
}

function compareRecords(
	left: Record<string, unknown>,
	right: Record<string, unknown>,
	path: string,
	diff: JsonDiff,
) {
	for (const [key, value] of Object.entries(left)) {
		const keyPath = jsonPathKey(path, key);

		if (Object.hasOwn(right, key)) {
			compareJson(value, right[key], keyPath, diff);
		} else {
			diff.removed.push({ path: keyPath, value });
		}
	}

	for (const [key, value] of Object.entries(right)) {
		if (!Object.hasOwn(left, key)) {
			diff.added.push({ path: jsonPathKey(path, key), value });
		}
	}
}
