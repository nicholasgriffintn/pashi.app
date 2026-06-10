import type { ResultStageValue, TextResultStageValue } from "./result-types";

const RESULT_HISTORY_TOOL_LIMIT = 5;
const RESULT_HISTORY_TOTAL_LIMIT = 40;

export function isHistoryResult(result: ResultStageValue | undefined): result is TextResultStageValue {
	return Boolean(result && (result.kind === "fields" || result.kind === "palette" || result.kind === "text"));
}

export function appendResultHistory(
	history: ResultStageValue[],
	previousResult: ResultStageValue | undefined,
) {
	if (!isHistoryResult(previousResult)) {
		return history;
	}

	const nextHistory = [
		previousResult,
		...history.filter((item) => !isSameHistoryEntry(item, previousResult)),
	];
	let toolCount = 0;

	return nextHistory
		.filter((item) => {
			if (!isHistoryResult(item) || item.type !== previousResult.type) {
				return true;
			}

			toolCount += 1;
			return toolCount <= RESULT_HISTORY_TOOL_LIMIT;
		})
		.slice(0, RESULT_HISTORY_TOTAL_LIMIT);
}

export function resultHistoryForResult(
	history: ResultStageValue[],
	result: ResultStageValue | undefined,
): TextResultStageValue[] {
	if (!isHistoryResult(result)) {
		return [];
	}

	return history
		.filter(isHistoryResult)
		.filter((item) => item.type === result.type);
}

export function clearResultHistoryForResult(
	history: ResultStageValue[],
	result: ResultStageValue | undefined,
) {
	if (!isHistoryResult(result)) {
		return history;
	}

	return history.filter((item) => !isHistoryResult(item) || item.type !== result.type);
}

function isSameHistoryEntry(left: ResultStageValue, right: TextResultStageValue) {
	return Boolean(
		isHistoryResult(left) &&
		left.type === right.type &&
		left.generatedAt &&
		right.generatedAt &&
		left.generatedAt === right.generatedAt,
	);
}
