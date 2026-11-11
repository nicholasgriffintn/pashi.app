import { isRecord } from "../../shared/records.ts";
import { BudgetExceededError } from "./budget.ts";

export const JSON_OUTPUT_LIMIT = 1_000_000;

export interface JsonBudget {
	maxDepth: number;
	maxNodes: number;
}

export function jsonChildValues(value: unknown): unknown[] {
	if (Array.isArray(value)) {
		return value;
	}

	return isRecord(value) ? Object.values(value) : [];
}

export function assertJsonWithinBudget(documents: readonly unknown[], budget: JsonBudget) {
	let nodes = 0;

	const visit = (value: unknown, depth: number) => {
		nodes += 1;

		if (nodes > budget.maxNodes) {
			throw new BudgetExceededError(`The JSON holds more than ${budget.maxNodes} values.`);
		}

		if (depth > budget.maxDepth) {
			throw new BudgetExceededError(`The JSON is nested deeper than ${budget.maxDepth} levels.`);
		}

		for (const child of jsonChildValues(value)) {
			visit(child, depth + 1);
		}
	};

	for (const document of documents) {
		visit(document, 0);
	}
}

export function createJsonOutputBudget(limit = JSON_OUTPUT_LIMIT) {
	let total = 0;

	return (path: string, ...values: unknown[]) => {
		total += path.length;

		for (const value of values) {
			total += JSON.stringify(value, null, 2).length;
		}

		if (total > limit) {
			throw new BudgetExceededError(
				`The result is larger than the ${limit} character limit. Narrow the input or path.`,
			);
		}
	};
}
