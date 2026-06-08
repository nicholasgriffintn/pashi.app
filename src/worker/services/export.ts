import { findGenerator } from "./generators/catalogue";
import type { GeneratorRequest } from "./generators/request";
import { createJsonResult } from "./generators/json";
import type { GeneratorResultValue, JsonResult } from "./generators/types";
import { json } from "../utils/http";

const EXPORT_FORMATS = ["csv", "json", "txt"] as const;

export function listExportFormats() {
	return EXPORT_FORMATS;
}

export async function createExportResponse(
	type: string,
	format: string,
	request: GeneratorRequest,
) {
	const generator = findGenerator(type);
	if (!generator) {
		return json({ error: "Unknown generator type." }, 404);
	}

	if (generator.result.kind === "image") {
		return json({ error: "Image generators are exported from their image endpoint." }, 400);
	}

	if (!isExportFormat(format)) {
		return json({ error: "Unsupported export format." }, 400);
	}

	try {
		const result = await createJsonResult(generator, request);
		return new Response(formatExportResult(result, format), {
			headers: {
				"Content-Disposition": `attachment; filename="${safeFilename(type)}.${format}"`,
				"Content-Type": contentTypeFor(format),
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : "Export failed." },
			400,
		);
	}
}

function isExportFormat(format: string): format is (typeof EXPORT_FORMATS)[number] {
	return EXPORT_FORMATS.includes(format as (typeof EXPORT_FORMATS)[number]);
}

function formatExportResult(result: JsonResult, format: (typeof EXPORT_FORMATS)[number]) {
	if (format === "json") {
		return JSON.stringify(result, null, 2);
	}

	if (format === "csv") {
		return formatCsv(result.result);
	}

	return formatText(result);
}

function formatCsv(value: GeneratorResultValue) {
	if (typeof value === "string") {
		return `${csvRow(["value"])}\n${csvRow([value])}\n`;
	}

	if (Array.isArray(value)) {
		return [
			csvRow(["index", "value"]),
			...value.map((item, index) => csvRow([`${index + 1}`, item])),
		].join("\n").concat("\n");
	}

	const entries = Object.entries(value);
	return [
		csvRow(entries.map(([key]) => key)),
		csvRow(entries.map(([, entryValue]) => entryValue)),
	].join("\n").concat("\n");
}

function formatText(result: JsonResult) {
	const { result: value } = result;
	if (typeof value === "string") {
		return `${value}\n`;
	}

	if (Array.isArray(value)) {
		return `${value.join("\n")}\n`;
	}

	return `${Object.entries(value)
		.map(([key, entryValue]) => `${key}: ${entryValue}`)
		.join("\n")}\n`;
}

function csvRow(values: readonly string[]) {
	return values.map(csvValue).join(",");
}

function csvValue(value: string) {
	return `"${value.replaceAll("\"", "\"\"")}"`;
}

function contentTypeFor(format: (typeof EXPORT_FORMATS)[number]) {
	switch (format) {
		case "csv":
			return "text/csv; charset=utf-8";
		case "json":
			return "application/json; charset=utf-8";
		case "txt":
			return "text/plain; charset=utf-8";
	}
}

function safeFilename(value: string) {
	return value.replace(/[^a-z0-9_-]/gi, "-").toLowerCase() || "pashi";
}
