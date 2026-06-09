export function csvRow(values: readonly string[]) {
	return values.map(csvValue).join(",");
}

export function csvValue(value: string) {
	return `"${value.replaceAll("\"", "\"\"")}"`;
}
