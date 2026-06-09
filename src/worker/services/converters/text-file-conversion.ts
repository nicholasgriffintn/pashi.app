import { isStringArray, isStringRecordArray, type StringRecord, uniqueKeys } from "../../../shared/records.ts";
import { csvRow, parseCsv, recordsToCsv } from "../../utils/csv.ts";
import { escapeXml } from "../../utils/text.ts";

export type TextFileFormat = "csv" | "html" | "json" | "md" | "txt";

export interface ConvertedTextFile {
	content: string;
	extension: TextFileFormat;
	mimeType: string;
	preview: string;
}

const MIME_TYPES: Record<TextFileFormat, string> = {
	csv: "text/csv;charset=utf-8",
	html: "text/html;charset=utf-8",
	json: "application/json;charset=utf-8",
	md: "text/markdown;charset=utf-8",
	txt: "text/plain;charset=utf-8",
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
	const source = readSourceContent(input);

	switch (outputFormat) {
		case "csv":
			return convertToCsv(source);
		case "html":
			return createHtmlDocument(source, sourceName);
		case "json":
			return convertToJson(source, sourceName);
		case "md":
			return convertToMarkdown(source, sourceName);
		case "txt":
			return source.text;
	}
}

interface SourceContent {
	records: StringRecord[];
	text: string;
	values: string[];
}

function readSourceContent(input: string): SourceContent {
	const parsedJson = parseJson(input);
	if (isStringRecordArray(parsedJson)) {
		return {
			records: parsedJson,
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

function convertToCsv(source: SourceContent) {
	if (source.records.length > 0) {
		return recordsToCsv(source.records);
	}

	if (source.values.length > 0) {
		return [csvRow(["value"]), ...source.values.map((item) => csvRow([item]))].join("\n");
	}

	return [csvRow(["line"]), ...source.text.split(/\r?\n/).map((line) => csvRow([line]))].join("\n");
}

function convertToJson(source: SourceContent, sourceName: string) {
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
	if (source.records.length > 0) {
		return recordsToMarkdownTable(source.records);
	}

	if (source.values.length > 0) {
		return source.values.map((value) => `- ${value}`).join("\n");
	}

	return `# ${sourceName}\n\n${source.text}`;
}

function createHtmlDocument(source: SourceContent, sourceName: string) {
	const body = source.records.length > 0
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
