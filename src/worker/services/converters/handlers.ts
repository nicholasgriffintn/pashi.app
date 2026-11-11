import { BudgetExceededError } from "../../utils/budget.ts";
import { UpstreamError } from "../../utils/cached-fetch.ts";
import { loadCurrencyRates } from "../../utils/currency-rates.ts";
import { RegexTesterError, testRegex } from "../../utils/regex-tester.ts";
import {
	isTextTransformFormat,
	TEXT_TRANSFORM_FORMATS,
	TextTransformError,
	transformText,
} from "../../utils/text-transforms.ts";
import { safeFilename } from "../../utils/text.ts";
import {
	convertCurrencyText,
	convertUnitText,
	parseCurrencyConversion,
	UNIT_OUTPUTS,
	UnitConversionError,
} from "../../utils/unit-conversion.ts";
import { jiraToMarkdown, markdownToJira } from "./atlassian-markup.ts";
import {
	AUDIO_TRANSCRIPTION_FORMATS,
	AudioTranscriptionError,
	isAudioTranscriptionFormat,
	normaliseTranscriptionLanguage,
	transcribeAudio,
} from "./audio-transcription.ts";
import {
	DATA_SHAPE_FORMATS,
	DataShapeError,
	inspectDataShape,
	isDataShapeFormat,
} from "./data-shape.ts";
import {
	DesignReferenceError,
	isDesignReferenceFormat,
	isIconLicenceFilter,
	lookupDesignReference,
	DESIGN_REFERENCE_FORMATS,
} from "./design-reference.ts";
import {
	DEVELOPER_INSPECT_FORMATS,
	DeveloperInspectError,
	inspectDeveloperText,
	isDeveloperInspectFormat,
} from "./developer-inspect.ts";
import {
	DEVELOPER_TEXT_FORMATS,
	DeveloperTextError,
	isDeveloperTextFormat,
	transformDeveloperText,
} from "./developer-text.ts";
import {
	convertDocumentToMarkdown,
	DOCUMENT_MARKDOWN_FORMATS,
	DocumentMarkdownError,
	isDocumentMarkdownFormat,
} from "./document-markdown.ts";
import { HTML_TRANSFORM_FORMATS, isHtmlTransformFormat, transformHtml } from "./html-transform.ts";
import {
	describeImage,
	IMAGE_DESCRIPTION_FORMATS,
	ImageDescriptionError,
	isImageDescriptionFormat,
} from "./image-description.ts";
import {
	isJsonTransformFormat,
	JSON_TRANSFORM_FORMATS,
	JsonTransformError,
	transformJson,
} from "./json-transform.ts";
import {
	convertMarkdownTarget,
	isMarkdownTargetFormat,
	MARKDOWN_TARGET_FORMATS,
} from "./markdown-targets.ts";
import {
	buildNewsBriefing,
	isNewsBriefingFormat,
	NEWS_BRIEFING_FORMATS,
	NewsBriefingError,
} from "./news-briefing.ts";
import {
	isRequestTransformFormat,
	REQUEST_TRANSFORM_FORMATS,
	RequestTransformError,
	transformRequestText,
} from "./request-transform.ts";
import {
	inspectSite,
	isSiteInspectFormat,
	SITE_INSPECT_FORMATS,
	SiteInspectError,
} from "./site-inspect.ts";
import {
	convertTextFileContent,
	isTextFileFormat,
	TEXT_FILE_FORMATS,
	type TextFileFormat,
} from "./text-file-conversion.ts";
import {
	isTimestampTransformFormat,
	TIMESTAMP_JSON_FORMATS,
	TIMESTAMP_TRANSFORM_FORMATS,
	TimestampTransformError,
	transformTimestamp,
} from "./timestamp-transform.ts";
import type { ConverterHandler, ConverterResult } from "./types";
import { isUkLookupFormat, lookupUk, UK_LOOKUP_FORMATS, UkLookupError } from "./uk-lookup.ts";
import { convertUrlToMarkdown, UrlToMarkdownError } from "./url-to-markdown.ts";
import {
	isUrlTransformFormat,
	transformUrl,
	URL_TRANSFORM_FORMATS,
	UrlTransformError,
} from "./url-transform.ts";
import {
	isWebPlatformFormat,
	lookupWebPlatform,
	WEB_PLATFORM_FORMATS,
	WebPlatformError,
} from "./web-platform.ts";
import {
	calculateWorkingDays,
	isWorkingDaysFormat,
	WORKING_DAYS_FORMATS,
	WorkingDaysError,
} from "./working-days.ts";

export class ConverterRequestError extends Error {
	readonly status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.status = status;
	}
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
	return format === "flatten" ||
		format === "format" ||
		format === "minify" ||
		format === "query" ||
		format === "sort"
		? "application/json;charset=utf-8"
		: "text/plain;charset=utf-8";
}

function dataShapeFormat(value: string | undefined) {
	const format = value || "json-shape";

	return isDataShapeFormat(format) ? format : undefined;
}

function developerInspectFormat(value: string | undefined) {
	const format = value || "jwt";

	return isDeveloperInspectFormat(format) ? format : undefined;
}

function developerTextFormat(value: string | undefined) {
	const format = value || "diff-lines";

	return isDeveloperTextFormat(format) ? format : undefined;
}

function documentMarkdownFormat(value: string | undefined) {
	const format = value || "markdown";

	return isDocumentMarkdownFormat(format) ? format : undefined;
}

function requestTransformFormat(value: string | undefined) {
	const format = value || "curl-to-fetch";

	return isRequestTransformFormat(format) ? format : undefined;
}

function htmlTransformFormat(value: string | undefined) {
	const format = value || "strip-tags";

	return isHtmlTransformFormat(format) ? format : undefined;
}

function timestampTransformFormat(value: string | undefined) {
	const format = value || "readable";

	return isTimestampTransformFormat(format) ? format : undefined;
}

function workingDaysFormat(value: string | undefined) {
	const format = value || "add";

	return isWorkingDaysFormat(format) ? format : undefined;
}

function urlTransformFormat(value: string | undefined) {
	const format = value || "parse";

	return isUrlTransformFormat(format) ? format : undefined;
}

export const converterHandlers: Record<string, ConverterHandler> = {
	"data-shape": ({ fields, input }) => {
		const outputFormat = dataShapeFormat(fields.outputFormat || fields.format);

		if (!outputFormat) {
			throw new ConverterRequestError(
				`Choose a supported data shape inspection: ${DATA_SHAPE_FORMATS.join(", ")}.`,
			);
		}

		try {
			return textResult(
				"data-shape",
				"Data shape",
				input,
				inspectDataShape(input, outputFormat),
				`Data shape inspected with ${outputFormat}.`,
				{ mimeType: "application/json;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof DataShapeError) {
				throw new ConverterRequestError(error.message);
			}

			throw error;
		}
	},
	"developer-inspect": async ({ fields, input }) => {
		const outputFormat = developerInspectFormat(fields.outputFormat || fields.format);

		if (!outputFormat) {
			throw new ConverterRequestError(
				`Choose a supported developer inspection: ${DEVELOPER_INSPECT_FORMATS.join(", ")}.`,
			);
		}

		try {
			return textResult(
				"developer-inspect",
				"Developer inspection",
				input,
				await inspectDeveloperText(input, outputFormat, fields),
				`Developer text inspected with ${outputFormat}.`,
				{ mimeType: "application/json;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof DeveloperInspectError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"audio-transcription": async ({ fields, file }, { env }) => {
		const outputFormat = fields.outputFormat || fields.format || "text";

		if (!isAudioTranscriptionFormat(outputFormat)) {
			throw new ConverterRequestError(
				`Choose a supported output format: ${AUDIO_TRANSCRIPTION_FORMATS.join(", ")}.`,
			);
		}

		if (!file) {
			throw new ConverterRequestError("Upload an audio file to transcribe.");
		}

		if (!env?.AI) {
			throw new ConverterRequestError("Audio transcription is not available.", 503);
		}

		try {
			const transcript = await transcribeAudio(
				env.AI,
				file,
				outputFormat,
				normaliseTranscriptionLanguage(fields.language),
			);

			return textResult(
				"audio-transcription",
				"Transcript",
				file.name,
				transcript.content,
				`Transcribed ${transcript.seconds} seconds of ${transcript.language} audio as ${outputFormat}.`,
				{ downloadName: transcript.downloadName, mimeType: transcript.mimeType },
			);
		} catch (error) {
			if (error instanceof AudioTranscriptionError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"image-description": async ({ fields, file }, { env }) => {
		const outputFormat = fields.outputFormat || fields.format || "all";

		if (!isImageDescriptionFormat(outputFormat)) {
			throw new ConverterRequestError(
				`Choose a supported output format: ${IMAGE_DESCRIPTION_FORMATS.join(", ")}.`,
			);
		}

		if (!file) {
			throw new ConverterRequestError("Upload an image to describe.");
		}

		if (!env?.AI) {
			throw new ConverterRequestError("Image description is not available.", 503);
		}

		try {
			const described = await describeImage(env.AI, file);
			const meta = "Image described with a vision model.";

			if (outputFormat === "alt-text") {
				return textResult("image-description", "Alt text", file.name, described.altText, meta);
			}

			if (outputFormat === "description") {
				return textResult(
					"image-description",
					"Description",
					file.name,
					described.description,
					meta,
				);
			}

			return {
				generatedAt: new Date().toISOString(),
				input: file.name,
				kind: "fields",
				label: "Image description",
				meta,
				result: { "Alt text": described.altText, Description: described.description },
				type: "image-description",
			};
		} catch (error) {
			if (error instanceof ImageDescriptionError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"document-to-markdown": async ({ fields, file }, { env }) => {
		const outputFormat = documentMarkdownFormat(fields.outputFormat || fields.format);

		if (!outputFormat) {
			throw new ConverterRequestError(
				`Choose a supported output format: ${DOCUMENT_MARKDOWN_FORMATS.join(", ")}.`,
			);
		}

		if (!file) {
			throw new ConverterRequestError("Upload a document file to convert.");
		}

		if (!env?.AI) {
			throw new ConverterRequestError("Document conversion is not available.", 503);
		}

		try {
			const converted = await convertDocumentToMarkdown(env.AI, file, outputFormat);
			const isMarkdown = outputFormat === "markdown";

			return textResult(
				"document-to-markdown",
				isMarkdown ? "Markdown" : "Plain text",
				file.name,
				converted.content,
				`${converted.label} converted to ${isMarkdown ? "Markdown" : "plain text"} (${converted.tokens} tokens).`,
				{
					downloadName: converted.downloadName,
					mimeType: isMarkdown ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8",
				},
			);
		} catch (error) {
			if (error instanceof DocumentMarkdownError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"developer-text": ({ fields, input }) => {
		const outputFormat = developerTextFormat(fields.outputFormat || fields.format);

		if (!outputFormat) {
			throw new ConverterRequestError(
				`Choose a supported developer text transform: ${DEVELOPER_TEXT_FORMATS.join(", ")}.`,
			);
		}

		try {
			return textResult(
				"developer-text",
				"Developer text",
				input,
				transformDeveloperText(input, outputFormat, fields),
				`Developer text transformed with ${outputFormat}.`,
				{
					mimeType: outputFormat.includes("json")
						? "application/json;charset=utf-8"
						: "text/plain;charset=utf-8",
				},
			);
		} catch (error) {
			if (error instanceof DeveloperTextError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"file-format": ({ fields, input }) => {
		const outputFormat = textFileFormat(fields.outputFormat || fields.format);

		if (!outputFormat) {
			throw new ConverterRequestError(
				`Choose a supported text-file output format: ${TEXT_FILE_FORMATS.join(", ")}.`,
			);
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
		textResult(
			"jira-to-markdown",
			"Markdown",
			input,
			jiraToMarkdown(input),
			"Jira wiki markup converted to Markdown",
		),
	"html-transform": ({ fields, input }) => {
		const outputFormat = htmlTransformFormat(fields.outputFormat || fields.format);

		if (!outputFormat) {
			throw new ConverterRequestError(
				`Choose a supported HTML transform: ${HTML_TRANSFORM_FORMATS.join(", ")}.`,
			);
		}

		return textResult(
			"html-transform",
			"HTML transform",
			input,
			transformHtml(input, outputFormat),
			`HTML transformed with ${outputFormat}.`,
			{
				mimeType:
					outputFormat === "to-markdown"
						? "text/markdown;charset=utf-8"
						: "text/plain;charset=utf-8",
			},
		);
	},
	"json-transform": ({ fields, input }) => {
		const outputFormat = jsonTransformFormat(fields.outputFormat || fields.format);

		if (!outputFormat) {
			throw new ConverterRequestError(
				`Choose a supported JSON transform: ${JSON_TRANSFORM_FORMATS.join(", ")}.`,
			);
		}

		try {
			return textResult(
				"json-transform",
				"JSON transform",
				input,
				transformJson(input, outputFormat, fields),
				`JSON transformed with ${outputFormat}.`,
				{ mimeType: jsonTransformMimeType(outputFormat) },
			);
		} catch (error) {
			if (error instanceof JsonTransformError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"markdown-to-jira": ({ input }) =>
		textResult(
			"markdown-to-jira",
			"Jira and Confluence markup",
			input,
			markdownToJira(input),
			"Markdown converted to wiki markup for Jira and Confluence",
		),
	"markdown-format": ({ fields, input }) => {
		const outputFormat = markdownTargetFormat(fields.outputFormat || fields.format);

		if (!outputFormat) {
			throw new ConverterRequestError(
				`Choose a supported Markdown output target: ${MARKDOWN_TARGET_FORMATS.join(", ")}.`,
			);
		}

		return textResult(
			"markdown-format",
			outputFormat === "slack" ? "Slack markdown" : "WordPress HTML",
			input,
			convertMarkdownTarget(input, outputFormat),
			`Markdown converted to ${outputFormat}.`,
			{
				mimeType:
					outputFormat === "wordpress-html"
						? "text/html;charset=utf-8"
						: "text/plain;charset=utf-8",
			},
		);
	},
	"regex-tester": ({ fields, input }) => {
		try {
			return textResult(
				"regex-tester",
				"Regex test",
				input,
				JSON.stringify(testRegex(input, fields), null, 2),
				"Regular expression tested against the text.",
				{ mimeType: "application/json;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof BudgetExceededError) {
				throw new ConverterRequestError(error.message, 422);
			}

			if (error instanceof RegexTesterError) {
				throw new ConverterRequestError(error.message);
			}

			throw error;
		}
	},
	"request-transform": ({ fields, input }) => {
		const outputFormat = requestTransformFormat(fields.outputFormat || fields.format);

		if (!outputFormat) {
			throw new ConverterRequestError(
				`Choose a supported request transform: ${REQUEST_TRANSFORM_FORMATS.join(", ")}.`,
			);
		}

		try {
			return textResult(
				"request-transform",
				"Request transform",
				input,
				transformRequestText(input, outputFormat),
				`Request transformed with ${outputFormat}.`,
				{
					mimeType:
						outputFormat === "curl-to-json"
							? "application/json;charset=utf-8"
							: "text/plain;charset=utf-8",
				},
			);
		} catch (error) {
			if (error instanceof RequestTransformError) {
				throw new ConverterRequestError(error.message);
			}

			throw error;
		}
	},
	"text-transform": ({ fields, input }) => {
		const outputFormat = textTransformFormat(fields.outputFormat || fields.format);

		if (!outputFormat) {
			throw new ConverterRequestError(
				`Choose a supported text transform: ${TEXT_TRANSFORM_FORMATS.join(", ")}.`,
			);
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
			throw new ConverterRequestError(
				`Choose a supported timestamp transform: ${TIMESTAMP_TRANSFORM_FORMATS.join(", ")}.`,
			);
		}

		try {
			return textResult(
				"timestamp-transform",
				"Timestamp transform",
				input,
				transformTimestamp(input, outputFormat, fields),
				`Timestamp transformed with ${outputFormat}.`,
				{
					mimeType: TIMESTAMP_JSON_FORMATS.includes(outputFormat)
						? "application/json;charset=utf-8"
						: "text/plain;charset=utf-8",
				},
			);
		} catch (error) {
			if (error instanceof TimestampTransformError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"url-transform": ({ fields, input }) => {
		const outputFormat = urlTransformFormat(fields.outputFormat || fields.format);

		if (!outputFormat) {
			throw new ConverterRequestError(
				`Choose a supported URL transform: ${URL_TRANSFORM_FORMATS.join(", ")}.`,
			);
		}

		try {
			return textResult(
				"url-transform",
				"URL transform",
				input,
				transformUrl(input, outputFormat),
				`URL text transformed with ${outputFormat}.`,
				{
					mimeType:
						outputFormat === "parse" || outputFormat === "query"
							? "application/json;charset=utf-8"
							: "text/plain;charset=utf-8",
				},
			);
		} catch (error) {
			if (error instanceof UrlTransformError) {
				throw new ConverterRequestError(error.message);
			}

			throw error;
		}
	},
	"site-inspect": async ({ fields, input }) => {
		const outputFormat = fields.outputFormat || fields.format;

		if (!isSiteInspectFormat(outputFormat)) {
			throw new ConverterRequestError(
				`Choose a supported inspection mode: ${SITE_INSPECT_FORMATS.join(", ")}.`,
			);
		}

		try {
			return textResult(
				"site-inspect",
				"Site inspection",
				input,
				await inspectSite(input, outputFormat),
				`Site inspected with ${outputFormat}.`,
				{ mimeType: "application/json;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof SiteInspectError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"web-platform": async ({ fields, input }) => {
		const outputFormat = fields.outputFormat || fields.format;

		if (!isWebPlatformFormat(outputFormat)) {
			throw new ConverterRequestError(
				`Choose a supported lookup mode: ${WEB_PLATFORM_FORMATS.join(", ")}.`,
			);
		}

		try {
			return textResult(
				"web-platform",
				"Web platform reference",
				input,
				JSON.stringify(await lookupWebPlatform(input, outputFormat), null, 2),
				`Looked up with ${outputFormat}.`,
				{ mimeType: "application/json;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof WebPlatformError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"news-briefing": async ({ fields, input }) => {
		const outputFormat = fields.outputFormat || fields.format;

		if (!isNewsBriefingFormat(outputFormat)) {
			throw new ConverterRequestError(
				`Choose a supported briefing mode: ${NEWS_BRIEFING_FORMATS.join(", ")}.`,
			);
		}

		try {
			return textResult(
				"news-briefing",
				"News briefing",
				input,
				JSON.stringify(
					await buildNewsBriefing(input, outputFormat, {
						feed: fields.feed,
						limit: fields.limit,
						window: fields.window,
					}),
					null,
					2,
				),
				`News briefing built with ${outputFormat}.`,
				{ mimeType: "application/json;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof NewsBriefingError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"url-to-markdown": async ({ input }, { env }) => {
		if (!env?.AI) {
			throw new ConverterRequestError("Page conversion is not available.", 503);
		}

		try {
			const page = await convertUrlToMarkdown(env.AI, input);

			return textResult(
				"url-to-markdown",
				"Page Markdown",
				input,
				JSON.stringify(page, null, 2),
				`Page converted to Markdown (${page.tokens} tokens).`,
				{ mimeType: "application/json;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof UrlToMarkdownError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"design-reference": async ({ fields, input }) => {
		const outputFormat = fields.outputFormat || fields.format;
		const licence = fields.licence || "any";

		if (!isDesignReferenceFormat(outputFormat)) {
			throw new ConverterRequestError(
				`Choose a supported reference mode: ${DESIGN_REFERENCE_FORMATS.join(", ")}.`,
			);
		}

		if (!isIconLicenceFilter(licence)) {
			throw new ConverterRequestError("Choose a licence filter: any or permissive.");
		}

		try {
			return textResult(
				"design-reference",
				"Design reference",
				input,
				JSON.stringify(await lookupDesignReference(input, outputFormat, licence), null, 2),
				`Looked up with ${outputFormat}.`,
				{ mimeType: "application/json;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof DesignReferenceError || error instanceof UpstreamError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"uk-lookup": async ({ fields, input }) => {
		const outputFormat = fields.outputFormat || fields.format;

		if (!isUkLookupFormat(outputFormat)) {
			throw new ConverterRequestError(
				`Choose a supported lookup mode: ${UK_LOOKUP_FORMATS.join(", ")}.`,
			);
		}

		try {
			return textResult(
				"uk-lookup",
				"UK lookup",
				input,
				JSON.stringify(await lookupUk(input, outputFormat), null, 2),
				`Looked up with ${outputFormat}.`,
				{ mimeType: "application/json;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof UkLookupError || error instanceof UpstreamError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"working-days": ({ fields, input }) => {
		const outputFormat = workingDaysFormat(fields.outputFormat || fields.format);

		if (!outputFormat) {
			throw new ConverterRequestError(
				`Choose a supported working days mode: ${WORKING_DAYS_FORMATS.join(", ")}.`,
			);
		}

		try {
			return textResult(
				"working-days",
				"Working days",
				input,
				calculateWorkingDays(input, outputFormat, fields),
				`Working days calculated with ${outputFormat}.`,
				{ mimeType: "application/json;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof WorkingDaysError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
	"unit-converter": async ({ fields, input }) => {
		try {
			const outputFormat = fields.outputFormat || fields.toUnit || fields.to;
			const fromUnit = fields.fromUnit || fields.from;
			const currency = parseCurrencyConversion(input, outputFormat, fromUnit);

			return textResult(
				"unit-converter",
				"Unit conversion",
				input,
				currency
					? convertCurrencyText(currency, await loadCurrencyRates())
					: convertUnitText(input, outputFormat, fromUnit),
				currency ? "Currency converted with reference rates." : "Unit value converted.",
				{ mimeType: "text/plain;charset=utf-8" },
			);
		} catch (error) {
			if (error instanceof UnitConversionError) {
				throw new ConverterRequestError(
					`${error.message} Supported outputs: ${UNIT_OUTPUTS.join(", ")}.`,
				);
			}

			if (error instanceof UpstreamError) {
				throw new ConverterRequestError(error.message, error.status);
			}

			throw error;
		}
	},
};
