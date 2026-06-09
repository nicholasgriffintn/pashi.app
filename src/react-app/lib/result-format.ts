import type { GenerateResult } from "./generate-api";

export type ResultRecord = Record<string, string>;

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

export function isRecordArray(value: unknown[]): value is ResultRecord[] {
	return value.every((item) => typeof item === "object" && item !== null && !Array.isArray(item));
}

export function isStringArray(value: unknown[]): value is string[] {
	return value.every((item) => typeof item === "string");
}

export function isColourRecordArray(records: ResultRecord[]) {
	return records.every((record) => Boolean(record.primary && record.hex && record.rgb));
}

export function uniqueKeys(records: ResultRecord[]) {
	return [...new Set(records.flatMap((record) => Object.keys(record)))];
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

function recordToText(record: ResultRecord) {
	return Object.entries(record)
		.map(([key, value]) => `${key}: ${value}`)
		.join("\n");
}
