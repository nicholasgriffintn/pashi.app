import { safeFilename } from "../../utils/text.ts";
import { jiraToMarkdown, markdownToJira } from "./atlassian-markup.ts";
import { convertTextFileContent, type TextFileFormat } from "./text-file-conversion.ts";
import type { ConverterHandler, ConverterResult } from "./types";

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

	if (value === "csv" || value === "html" || value === "json" || value === "md" || value === "txt") {
		return value;
	}

	return undefined;
}

export const converterHandlers: Record<string, ConverterHandler> = {
	"file-format": ({ fields, input }) => {
		const outputFormat = textFileFormat(fields.outputFormat || fields.format);
		if (!outputFormat) {
			throw new ConverterRequestError("Choose a supported text-file output format: txt, md, json, csv, or html.");
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
	"markdown-to-jira": ({ input }) =>
		textResult("markdown-to-jira", "Jira markup", input, markdownToJira(input), "Markdown converted to Jira and Confluence wiki markup"),
};
