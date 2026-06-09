import { isStringArray, isStringRecord, isStringRecordArray, type StringRecord, uniqueKeys } from "../../../shared/records.ts";
import { csvRow, parseCsv, recordsToCsv } from "../../utils/csv.ts";
import {
	parseKeyValueText,
	parseXmlRecords,
	recordToEnv,
	recordToIni,
	recordToToml,
	recordToXml,
	recordToYaml,
	recordsToSqlInserts,
	recordsToToml,
	recordsToXml,
	recordsToYaml,
	sourceNameStem,
} from "../../utils/structured-data.ts";
import { escapeXml } from "../../utils/text.ts";

export type TextFileFormat = "csv" | "env" | "html" | "ini" | "json" | "md" | "properties" | "sql" | "toml" | "tsv" | "txt" | "xls" | "xml" | "yaml";

export const TEXT_FILE_FORMATS: readonly TextFileFormat[] = ["txt", "md", "json", "csv", "tsv", "html", "xls", "yaml", "toml", "xml", "ini", "properties", "env", "sql"];

export function isTextFileFormat(value: string): value is TextFileFormat {
	return TEXT_FILE_FORMATS.some((format) => format === value);
}

export interface ConvertedTextFile {
	content: string;
	extension: TextFileFormat;
	mimeType: string;
	preview: string;
}

const MIME_TYPES: Record<TextFileFormat, string> = {
	csv: "text/csv;charset=utf-8",
	env: "text/plain;charset=utf-8",
	html: "text/html;charset=utf-8",
	ini: "text/plain;charset=utf-8",
	json: "application/json;charset=utf-8",
	md: "text/markdown;charset=utf-8",
	properties: "text/plain;charset=utf-8",
	sql: "application/sql;charset=utf-8",
	toml: "application/toml;charset=utf-8",
	tsv: "text/tab-separated-values;charset=utf-8",
	txt: "text/plain;charset=utf-8",
	xls: "application/vnd.ms-excel;charset=utf-8",
	xml: "application/xml;charset=utf-8",
	yaml: "application/yaml;charset=utf-8",
};

export function convertTextFileContent(
	input: string,
	outputFormat: TextFileFormat,
	sourceName = "file",
): ConvertedTextFile {
	const content = createConvertedContent(input, outputFormat, sourceName);

	return {
		content,
		extension: outputFormat,
		mimeType: MIME_TYPES[outputFormat],
		preview: content.slice(0, 4000),
	};
}

function createConvertedContent(
	input: string,
	outputFormat: TextFileFormat,
	sourceName: string,
) {
	const source = readSourceContent(input, sourceName);

	switch (outputFormat) {
		case "csv":
			return convertToCsv(source);
		case "env":
			return convertToKeyValue(source, "env");
		case "html":
			return createHtmlDocument(source, sourceName);
		case "ini":
			return convertToKeyValue(source, "ini");
		case "json":
			return convertToJson(source, sourceName);
		case "md":
			return convertToMarkdown(source, sourceName);
		case "properties":
			return convertToKeyValue(source, "properties");
		case "sql":
			return convertToSql(source, sourceName);
		case "toml":
			return convertToToml(source);
		case "tsv":
			return convertToTsv(source);
		case "txt":
			return source.text;
		case "xls":
			return createExcelHtmlDocument(source, sourceName);
		case "xml":
			return convertToXml(source);
		case "yaml":
			return convertToYaml(source);
	}
}

interface SourceContent {
	keyValues?: StringRecord;
	records: StringRecord[];
	text: string;
	values: string[];
}

function readSourceContent(input: string, sourceName = "file"): SourceContent {
	const parsedJson = parseJson(input);
	if (isStringRecordArray(parsedJson)) {
		return {
			records: parsedJson,
			text: JSON.stringify(parsedJson, null, 2),
			values: [],
		};
	}

	if (isStringRecord(parsedJson)) {
		return {
			keyValues: parsedJson,
			records: [],
			text: JSON.stringify(parsedJson, null, 2),
			values: [],
		};
	}

	if (isStringArray(parsedJson)) {
		return {
			records: [],
			text: parsedJson.join("\n"),
			values: parsedJson,
		};
	}

	const xmlRecords = shouldPreferXmlSource(sourceName, input) ? parseXmlRecords(input) : [];
	if (xmlRecords.length > 0) {
		return {
			records: xmlRecords,
			text: input,
			values: [],
		};
	}

	const keyValues = parseKeyValueText(input);
	if (keyValues && shouldPreferKeyValueSource(sourceName, input)) {
		return {
			keyValues,
			records: [],
			text: input,
			values: [],
		};
	}

	const csvRecords = parseCsv(input);
	if (csvRecords.length > 0) {
		return {
			records: csvRecords,
			text: input,
			values: [],
		};
	}

	return {
		records: [],
		text: stripHtml(input),
		values: [],
	};
}

function convertToTsv(source: SourceContent) {
	if (source.keyValues) {
		return recordsToTsv([source.keyValues]);
	}

	if (source.records.length > 0) {
		return recordsToTsv(source.records);
	}

	if (source.values.length > 0) {
		return ["value", ...source.values].join("\n");
	}

	return ["line", ...source.text.split(/\r?\n/)].join("\n");
}

function convertToCsv(source: SourceContent) {
	if (source.keyValues) {
		return recordsToCsv([source.keyValues]);
	}

	if (source.records.length > 0) {
		return recordsToCsv(source.records);
	}

	if (source.values.length > 0) {
		return [csvRow(["value"]), ...source.values.map((item) => csvRow([item]))].join("\n");
	}

	return [csvRow(["line"]), ...source.text.split(/\r?\n/).map((line) => csvRow([line]))].join("\n");
}

function convertToJson(source: SourceContent, sourceName: string) {
	if (source.keyValues) {
		return JSON.stringify(source.keyValues, null, 2);
	}

	if (source.records.length > 0) {
		return JSON.stringify(source.records, null, 2);
	}

	if (source.values.length > 0) {
		return JSON.stringify(source.values, null, 2);
	}

	return JSON.stringify({
		content: source.text,
		name: sourceName,
	}, null, 2);
}

function convertToMarkdown(source: SourceContent, sourceName: string) {
	if (source.keyValues) {
		return recordsToMarkdownTable([source.keyValues]);
	}

	if (source.records.length > 0) {
		return recordsToMarkdownTable(source.records);
	}

	if (source.values.length > 0) {
		return source.values.map((value) => `- ${value}`).join("\n");
	}

	return `# ${sourceName}\n\n${source.text}`;
}

function createHtmlDocument(source: SourceContent, sourceName: string) {
	const body = source.keyValues
		? recordsToHtmlTable([source.keyValues])
		: source.records.length > 0
		? recordsToHtmlTable(source.records)
		: `<pre>${escapeXml(source.text)}</pre>`;

	return [
		"<!doctype html>",
		"<html>",
		"<head>",
		`\t<title>${escapeXml(sourceName)}</title>`,
		"\t<meta charset=\"utf-8\">",
		"</head>",
		"<body>",
		`\t${body}`,
		"</body>",
		"</html>",
	].join("\n");
}

function createExcelHtmlDocument(source: SourceContent, sourceName: string) {
	const body = source.keyValues
		? recordsToHtmlTable([source.keyValues])
		: source.records.length > 0
		? recordsToHtmlTable(source.records)
		: recordsToHtmlTable([{ content: source.text }]);

	return [
		"<html>",
		"<head>",
		`\t<meta charset="utf-8">`,
		`\t<title>${escapeXml(sourceName)}</title>`,
		"</head>",
		"<body>",
		`\t${body}`,
		"</body>",
		"</html>",
	].join("\n");
}

function convertToYaml(source: SourceContent) {
	if (source.keyValues) {
		return recordToYaml(source.keyValues);
	}

	if (source.records.length > 0) {
		return recordsToYaml(source.records);
	}

	return recordToYaml({ content: source.text });
}

function convertToToml(source: SourceContent) {
	if (source.keyValues) {
		return recordToToml(source.keyValues);
	}

	if (source.records.length > 0) {
		return recordsToToml(source.records);
	}

	return recordToToml({ content: source.text });
}

function convertToXml(source: SourceContent) {
	if (source.keyValues) {
		return recordToXml(source.keyValues);
	}

	if (source.records.length > 0) {
		return recordsToXml(source.records);
	}

	return recordToXml({ content: source.text });
}

function convertToKeyValue(source: SourceContent, outputFormat: "env" | "ini" | "properties") {
	const record = source.keyValues ?? source.records[0] ?? { content: source.text };
	if (outputFormat === "env") {
		return recordToEnv(record);
	}

	return recordToIni(record);
}

function convertToSql(source: SourceContent, sourceName: string) {
	if (source.records.length > 0) {
		return recordsToSqlInserts(source.records, sourceNameStem(sourceName));
	}

	return recordsToSqlInserts([source.keyValues ?? { content: source.text }], sourceNameStem(sourceName));
}

function recordsToMarkdownTable(records: readonly StringRecord[]) {
	const columns = uniqueKeys(records);
	if (columns.length === 0) {
		return "";
	}

	return [
		`| ${columns.map(markdownTableCell).join(" | ")} |`,
		`| ${columns.map(() => "---").join(" | ")} |`,
		...records.map((record) => `| ${columns.map((column) => markdownTableCell(record[column] ?? "")).join(" | ")} |`),
	].join("\n");
}

function recordsToTsv(records: readonly StringRecord[]) {
	const columns = uniqueKeys(records);
	if (columns.length === 0) {
		return "";
	}

	return [
		columns.map(tsvCell).join("\t"),
		...records.map((record) => columns.map((column) => tsvCell(record[column] ?? "")).join("\t")),
	].join("\n");
}

function tsvCell(value: string) {
	return value.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

function markdownTableCell(value: string) {
	return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function recordsToHtmlTable(records: readonly StringRecord[]) {
	const columns = uniqueKeys(records);
	if (columns.length === 0) {
		return "";
	}

	return [
		"<table>",
		"\t<thead>",
		`\t\t<tr>${columns.map((column) => `<th>${escapeXml(column)}</th>`).join("")}</tr>`,
		"\t</thead>",
		"\t<tbody>",
		...records.map((record) => `\t\t<tr>${columns.map((column) => `<td>${escapeXml(record[column] ?? "")}</td>`).join("")}</tr>`),
		"\t</tbody>",
		"</table>",
	].join("\n");
}

function stripHtml(input: string) {
	return input
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, "\"")
		.replace(/&#39;|&apos;/g, "'")
		.trim();
}

function parseJson(input: string) {
	try {
		return JSON.parse(input) as unknown;
	} catch {
		return undefined;
	}
}

function shouldPreferKeyValueSource(sourceName: string, input: string) {
	const extension = sourceName.toLowerCase().split(".").pop();
	if (extension === "env" || extension === "ini" || extension === "properties" || extension === "toml") {
		return true;
	}

	const nonEmptyLines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	return nonEmptyLines.length > 0 && nonEmptyLines.every((line) => /^(?:export\s+)?[A-Za-z_][\w.-]*\s*[=:]/.test(line));
}

function shouldPreferXmlSource(sourceName: string, input: string) {
	const extension = sourceName.toLowerCase().split(".").pop();
	return extension === "xml" || /^\s*<\?xml\b/i.test(input);
}
