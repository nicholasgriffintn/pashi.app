import { isTextTransformFormat, TEXT_TRANSFORM_FORMATS, TextTransformError, transformText } from "../../utils/text-transforms.ts";
import { convertUnitText, UNIT_OUTPUTS, UnitConversionError } from "../../utils/unit-conversion.ts";
import { safeFilename } from "../../utils/text.ts";
import { jiraToMarkdown, markdownToJira } from "./atlassian-markup.ts";
import { convertTextFileContent, isTextFileFormat, TEXT_FILE_FORMATS, type TextFileFormat } from "./text-file-conversion.ts";
import { HTML_TRANSFORM_FORMATS, isHtmlTransformFormat, transformHtml } from "./html-transform.ts";
import { isJsonTransformFormat, JSON_TRANSFORM_FORMATS, JsonTransformError, transformJson } from "./json-transform.ts";
import { convertMarkdownTarget, isMarkdownTargetFormat, MARKDOWN_TARGET_FORMATS } from "./markdown-targets.ts";
import type { ConverterHandler, ConverterResult } from "./types";
import { isTimestampTransformFormat, TIMESTAMP_TRANSFORM_FORMATS, TimestampTransformError, transformTimestamp } from "./timestamp-transform.ts";
import { isUrlTransformFormat, transformUrl, URL_TRANSFORM_FORMATS, UrlTransformError } from "./url-transform.ts";

export class ConverterRequestError extends Error {
	status = 400;
}

function textResult(
	type: string,
	label: string,
	input: string,
	result: string,
	meta: string,
	options: Pick<ConverterResult, "downloadName" | "mimeType"> = {},
): ConverterResult {
	return {
		...options,
		generatedAt: new Date().toISOString(),
		input,
		kind: "text",
		label,
		meta,
		result,
		type,
	};
}

function textFileFormat(value: string | undefined): TextFileFormat | undefined {
	if (!value) {
		return "txt";
	}

	if (isTextFileFormat(value)) {
		return value;
	}

	return undefined;
}

function textTransformFormat(value: string | undefined) {
	const format = value || "lowercase";
	return isTextTransformFormat(format) ? format : undefined;
}

function markdownTargetFormat(value: string | undefined) {
	const format = value || "slack";
	return isMarkdownTargetFormat(format) ? format : undefined;
}

function jsonTransformFormat(value: string | undefined) {
	const format = value || "format";
	return isJsonTransformFormat(format) ? format : undefined;
}

function jsonTransformMimeType(format: (typeof JSON_TRANSFORM_FORMATS)[number]) {
	return format === "flatten" || format === "format" || format === "minify" || format === "sort"
		? "application/json;charset=utf-8"
		: "text/plain;charset=utf-8";
}

function htmlTransformFormat(value: string | undefined) {
	const format = value || "strip-tags";
	return isHtmlTransformFormat(format) ? format : undefined;
}

function timestampTransformFormat(value: string | undefined) {
	const format = value || "readable";
	return isTimestampTransformFormat(format) ? format : undefined;
}

function urlTransformFormat(value: string | undefined) {
	const format = value || "parse";
	return isUrlTransformFormat(format) ? format : undefined;
}

export const converterHandlers: Record<string, ConverterHandler> = {
	"file-format": ({ fields, input }) => {
		const outputFormat = textFileFormat(fields.outputFormat || fields.format);
		if (!outputFormat) {
			throw new ConverterRequestError(`Choose a supported text-file output format: ${TEXT_FILE_FORMATS.join(", ")}.`);
		}

		const sourceName = fields.sourceName || fields.name || "file";
		const converted = convertTextFileContent(input, outputFormat, sourceName);
		return textResult(
			"file-format",
			`${converted.extension.toUpperCase()} file`,
			input,
			converted.content,
			`Text file converted to ${converted.extension.toUpperCase()}`,
			{
				downloadName: `pashi-${safeFilename(sourceName.replace(/\.[^.]+$/, ""))}.${converted.extension}`,
				mimeType: converted.mimeType,
			},
		);
	},
	"jira-to-markdown": ({ input }) =>
		textResult("jira-to-markdown", "Markdown", input, jiraToMarkdown(input), "Jira wiki markup converted to Markdown"),
	"html-transform": ({ fields, input }) => {
		const outputFormat = htmlTransformFormat(fields.outputFormat || fields.format);
		if (!outputFormat) {
			throw new ConverterRequestError(`Choose a supported HTML transform: ${HTML_TRANSFORM_FORMATS.join(", ")}.`);
		}

		return textResult(
			"html-transform",
			"HTML transform",
			input,
			transformHtml(input, outputFormat),
			`HTML transformed with ${outputFormat}.`,
			{ mimeType: outputFormat === "to-markdown" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8" },
		);
	},
	"json-transform": ({ fields, input }) => {
		const outputFormat = jsonTransformFormat(fields.outputFormat || fields.format);
		if (!outputFormat) {
			throw new ConverterRequestError(`Choose a supported JSON transform: ${JSON_TRANSFORM_FORMATS.join(", ")}.`);
		}

		try {
			return textResult(
				"json-transform",
				"JSON transform",
				input,
				transformJson(input, outputFormat),
				`JSON transformed with ${outputFormat}.`,
				{ mimeType: jsonTransformMimeType(outputFormat) },
			);
		} catch (error) {
			if (error instanceof JsonTransformError) {
				throw new ConverterRequestError(error.message);
			}

			throw error;
		}
	},
	"markdown-to-jira": ({ input }) =>
		textResult("markdown-to-jira", "Jira markup", input, markdownToJira(input), "Markdown converted to Jira and Confluence wiki markup"),
	"markdown-format": ({ fields, input }) => {
		const outputFormat = markdownTargetFormat(fields.outputFormat || fields.format);
		if (!outputFormat) {
			throw new ConverterRequestError(`Choose a supported Markdown output target: ${MARKDOWN_TARGET_FORMATS.join(", ")}.`);
		}

		return textResult(
			"markdown-format",
			outputFormat === "slack" ? "Slack markdown" : "WordPress HTML",
			input,
			convertMarkdownTarget(input, outputFormat),
			`Markdown converted to ${outputFormat}.`,
			{ mimeType: outputFormat === "wordpress-html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8" },
		);
	},
	"text-transform": ({ fields, input }) => {
		const outputFormat = textTransformFormat(fields.outputFormat || fields.format);
		if (!outputFormat) {
			throw new ConverterRequestError(`Choose a supported text transform: ${TEXT_TRANSFORM_FORMATS.join(", ")}.`);
		}

		try {
			return textResult(
				"text-transform",
				"Text transform",
				input,
				transformText(input, outputFormat, fields),
				`Text transformed with ${outputFormat}.`,
				{ mimeType: "text/plain;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof TextTransformError) {
				throw new ConverterRequestError(error.message);
			}

			throw error;
		}
	},
	"timestamp-transform": ({ fields, input }) => {
		const outputFormat = timestampTransformFormat(fields.outputFormat || fields.format);
		if (!outputFormat) {
			throw new ConverterRequestError(`Choose a supported timestamp transform: ${TIMESTAMP_TRANSFORM_FORMATS.join(", ")}.`);
		}

		try {
			return textResult(
				"timestamp-transform",
				"Timestamp transform",
				input,
				transformTimestamp(input, outputFormat, fields),
				`Timestamp transformed with ${outputFormat}.`,
				{ mimeType: outputFormat === "difference" ? "application/json;charset=utf-8" : "text/plain;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof TimestampTransformError) {
				throw new ConverterRequestError(error.message);
			}

			throw error;
		}
	},
	"url-transform": ({ fields, input }) => {
		const outputFormat = urlTransformFormat(fields.outputFormat || fields.format);
		if (!outputFormat) {
			throw new ConverterRequestError(`Choose a supported URL transform: ${URL_TRANSFORM_FORMATS.join(", ")}.`);
		}

		try {
			return textResult(
				"url-transform",
				"URL transform",
				input,
				transformUrl(input, outputFormat),
				`URL text transformed with ${outputFormat}.`,
				{ mimeType: outputFormat === "parse" || outputFormat === "query" ? "application/json;charset=utf-8" : "text/plain;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof UrlTransformError) {
				throw new ConverterRequestError(error.message);
			}

			throw error;
		}
	},
	"unit-converter": ({ fields, input }) => {
		try {
			const outputFormat = fields.outputFormat || fields.toUnit || fields.to;
			return textResult(
				"unit-converter",
				"Unit conversion",
				input,
				convertUnitText(input, outputFormat, fields.fromUnit || fields.from),
				"Unit value converted.",
				{ mimeType: "text/plain;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof UnitConversionError) {
				throw new ConverterRequestError(`${error.message} Supported outputs: ${UNIT_OUTPUTS.join(", ")}.`);
			}

			throw error;
		}
	},
};
