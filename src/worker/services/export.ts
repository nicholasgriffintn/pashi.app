import { isRecordArray, recordToText, uniqueKeys } from "../../shared/records";
import { csvRow } from "../utils/csv";
import { toErrorResponse } from "../utils/error-response";
import { errorJson } from "../utils/http";
import { safeFilename } from "../utils/text";
import { isExportFormat, type ExportFormat } from "./export-formats";
import { createFeatureStatus, type FeatureEnv } from "./features";
import { findGenerator } from "./generators/catalogue";
import { createJsonResult } from "./generators/json";
import type { GeneratorRequest } from "./generators/request";
import { usesAiMode } from "./generators/request";
import type { GeneratorResultValue, JsonResult } from "./generators/types";

export async function createExportResponse(
	type: string,
	format: string,
	request: GeneratorRequest,
	env?: FeatureEnv,
) {
	const generator = findGenerator(type);

	if (!generator) {
		return errorJson("Unknown generator type.", 404, "not_found");
	}

	if (generator.result.kind === "image") {
		return errorJson(
			"Image generators are exported from their image endpoint.",
			400,
			"invalid_request",
		);
	}

	if (!isExportFormat(format)) {
		return errorJson("Unsupported export format.", 400, "invalid_request");
	}

	if (usesAiMode(request) && (!env || !createFeatureStatus(env).ai.available)) {
		return errorJson("AI mode is not available.", 503, "unavailable");
	}

	try {
		const result = await createJsonResult(generator, request, env?.AI ? { AI: env.AI } : undefined);

		return new Response(formatExportResult(result, format), {
			headers: {
				"Content-Disposition": `attachment; filename="${safeFilename(type)}.${format}"`,
				"Content-Type": contentTypeFor(format),
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (error) {
		return toErrorResponse(error, "Export failed.");
	}
}

function formatExportResult(result: JsonResult, format: ExportFormat) {
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
		if (isRecordArray(value)) {
			const columns = uniqueKeys(value);

			return [
				csvRow(columns),
				...value.map((record) => csvRow(columns.map((column) => record[column] ?? ""))),
			]
				.join("\n")
				.concat("\n");
		}

		return [
			csvRow(["index", "value"]),
			...value.map((item, index) => csvRow([`${index + 1}`, item])),
		]
			.join("\n")
			.concat("\n");
	}

	const entries = Object.entries(value);

	return [csvRow(entries.map(([key]) => key)), csvRow(entries.map(([, entryValue]) => entryValue))]
		.join("\n")
		.concat("\n");
}

function formatText(result: JsonResult) {
	const { result: value } = result;

	if (typeof value === "string") {
		return `${value}\n`;
	}

	if (Array.isArray(value)) {
		if (isRecordArray(value)) {
			return `${value.map(formatRecordText).join("\n\n")}\n`;
		}

		return `${value.join("\n")}\n`;
	}

	return `${formatRecordText(value)}\n`;
}

function formatRecordText(record: Record<string, string>) {
	return recordToText(record);
}

function contentTypeFor(format: ExportFormat) {
	switch (format) {
		case "csv":
			return "text/csv; charset=utf-8";
		case "json":
			return "application/json; charset=utf-8";
		case "txt":
			return "text/plain; charset=utf-8";
	}
}
