import type { StringRecord } from "../../shared/records.ts";

export function csvRow(values: readonly string[]) {
	return values.map(csvValue).join(",");
}

export function csvValue(value: string) {
	return `"${value.replace(/"/g, "\"\"")}"`;
}

export function recordsToCsv(records: readonly StringRecord[]) {
	if (records.length === 0) {
		return "";
	}

	const columns = [...new Set(records.flatMap((record) => Object.keys(record)))];
	return [
		csvRow(columns),
		...records.map((record) => csvRow(columns.map((column) => record[column] ?? ""))),
	].join("\n");
}

export function parseCsv(value: string): StringRecord[] {
	const rows = parseCsvRows(value);
	return recordsFromRows(rows);
}

export function parseTsv(value: string): StringRecord[] {
	const rows = value
		.split(/\r?\n/)
		.map((row) => row.split("\t"));
	return recordsFromRows(rows);
}

function recordsFromRows(rows: string[][]): StringRecord[] {
	const [headers, ...body] = rows;
	if (!headers?.length) {
		return [];
	}

	return body
		.filter((row) => row.some((cell) => cell.trim()))
		.map((row) =>
			Object.fromEntries(headers.map((header, index) => [header || `column_${index + 1}`, row[index] ?? ""])),
		);
}

function parseCsvRows(value: string) {
	const rows: string[][] = [];
	let cell = "";
	let row: string[] = [];
	let inQuotes = false;

	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];
		const nextChar = value[index + 1];

		if (char === "\"" && inQuotes && nextChar === "\"") {
			cell += "\"";
			index += 1;
			continue;
		}

		if (char === "\"") {
			inQuotes = !inQuotes;
			continue;
		}

		if (char === "," && !inQuotes) {
			row.push(cell);
			cell = "";
			continue;
		}

		if ((char === "\n" || char === "\r") && !inQuotes) {
			if (char === "\r" && nextChar === "\n") {
				index += 1;
			}
			row.push(cell);
			rows.push(row);
			row = [];
			cell = "";
			continue;
		}

		cell += char;
	}

	row.push(cell);
	rows.push(row);
	return rows;
}
