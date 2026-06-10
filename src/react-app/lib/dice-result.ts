import type { ResultRecord } from "./result-format";
import { isRecordArray } from "./result-format";
import type { ResultStageValue } from "./result-types";

export interface DiceRollRecord extends ResultRecord {
	diceType: string;
	modifier: string;
	notation: string;
	roll: string;
	subtotal: string;
	total: string;
}

export interface DiceStageResult {
	generatedAt?: string;
	input: string;
	kind: "fields";
	label: string;
	meta: string;
	result: DiceRollRecord | DiceRollRecord[];
	type: "dice";
}

const DICE_HISTORY_LIMIT = 5;

export function isDiceStageResult(result: ResultStageValue | undefined): result is DiceStageResult {
	if (!result || result.kind !== "fields" || result.type !== "dice") {
		return false;
	}

	if (Array.isArray(result.result)) {
		return isRecordArray(result.result) && result.result.every(isDiceRollRecord);
	}

	if (typeof result.result === "string") {
		return false;
	}

	return isDiceRollRecord(result.result);
}

export function diceRollRecords(result: DiceStageResult) {
	return Array.isArray(result.result) ? result.result : [result.result];
}

export function appendDiceResultHistory(
	history: ResultStageValue[],
	previousResult: ResultStageValue | undefined,
) {
	if (!isDiceStageResult(previousResult)) {
		return history;
	}

	return [
		previousResult,
		...history.filter((item) => !isSameDiceResult(item, previousResult)),
	].slice(0, DICE_HISTORY_LIMIT);
}

export function diceHistoryResults(history: ResultStageValue[]) {
	return history.filter(isDiceStageResult);
}

function isDiceRollRecord(record: ResultRecord): record is DiceRollRecord {
	return Boolean(
		record.diceType &&
		record.modifier &&
		record.notation &&
		record.roll &&
		record.subtotal &&
		record.total,
	);
}

function isSameDiceResult(left: ResultStageValue, right: DiceStageResult) {
	return Boolean(
		isDiceStageResult(left) &&
		left.generatedAt &&
		right.generatedAt &&
		left.generatedAt === right.generatedAt,
	);
}
