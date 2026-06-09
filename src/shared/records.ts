export type StringRecord = Record<string, string>;

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStringRecord(value: unknown): value is StringRecord {
	return (
		isRecord(value) &&
		Object.values(value).every((item) => typeof item === "string")
	);
}

export function isStringRecordArray(value: unknown): value is StringRecord[] {
	return Array.isArray(value) && value.every(isStringRecord);
}

export function isRecordArray(value: unknown[]): value is StringRecord[] {
	return value.every(isStringRecord);
}

export function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function recordToText(record: StringRecord) {
	return Object.entries(record)
		.map(([key, value]) => `${key}: ${value}`)
		.join("\n");
}

export function uniqueKeys(records: readonly StringRecord[]) {
	return [...new Set(records.flatMap((record) => Object.keys(record)))];
}
