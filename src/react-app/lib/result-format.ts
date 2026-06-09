import type { GenerateResult } from "./generate-api";
import {
	isRecordArray,
	isStringArray,
	recordToText,
	type StringRecord,
	uniqueKeys,
} from "../../shared/records";

export type ResultRecord = StringRecord;
export { isRecordArray, isStringArray, uniqueKeys };

export function formatGeneratedAt(value: string | undefined) {
	if (!value) {
		return undefined;
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function formatTextResult(value: GenerateResult["result"]) {
	if (Array.isArray(value)) {
		if (isStringArray(value)) {
			return value.join("\n");
		}

		return value.map((record) => Object.values(record).join("\t")).join("\n");
	}

	if (typeof value === "string") {
		return value;
	}

	return Object.values(value).join("\n");
}

export function isColourRecordArray(records: ResultRecord[]) {
	return records.every((record) => Boolean(record.primary && record.hex && record.rgb));
}

export function resultToText(result: GenerateResult) {
	if (Array.isArray(result.result)) {
		if (isRecordArray(result.result)) {
			return result.result.map(recordToText).join("\n\n");
		}

		return result.result.join("\n");
	}

	if (typeof result.result === "string") {
		return result.result;
	}

	return recordToText(result.result);
}
