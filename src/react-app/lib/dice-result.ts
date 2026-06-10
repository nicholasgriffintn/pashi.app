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
