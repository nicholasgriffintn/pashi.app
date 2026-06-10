import type { GeneratorRequest } from "../request.ts";
import type { GeneratorResultRecord, GeneratorTool, JsonResult } from "../types.ts";
import { isRecord } from "../../../../shared/records.ts";
import { parseChoice, parseInteger } from "../../../utils/generation.ts";
import { escapeXml } from "../../../utils/text.ts";
import { fieldsResult, textResult } from "./result.ts";

const CRON_PRESETS = ["hourly", "daily", "weekly", "monthly"] as const;
const REGEX_PRESETS = [
	"email",
	"url",
	"uuid",
	"hex-colour",
	"ipv4",
	"slug",
	"iso-date",
	"time",
	"integer",
	"decimal",
	"whitespace",
	"html-tag",
] as const;
const REGEX_FLAGS = ["none", "i", "g", "gi", "m", "im"] as const;

interface RegexPreset {
	description: string;
	exampleMatch: string;
	exampleNonMatch: string;
	pattern: string;
}

export function createDeveloperResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	switch (generator.id) {
		case "cron-expression":
			return fieldsResult(generator, request.input, createCronExpression(request));
		case "regex-pattern":
			return fieldsResult(generator, request.input, createRegexPattern(request));
		case "html-meta-tags":
			return textResult(generator, request.input, createHtmlMetaTags(request));
		case "json-api-response":
			return textResult(generator, request.input, createJsonApiResponse(request));
		case "json-axios-code":
			return textResult(generator, request.input, createAxiosSnippet(request));
		case "json-fetch-code":
			return textResult(generator, request.input, createFetchSnippet(request));
		case "json-schema-example":
			return textResult(generator, request.input, createJsonSchemaExample(request));
		case "json-to-typescript":
			return textResult(generator, request.input, createTypeScriptInterface(request));
		default:
			return undefined;
	}
}

function createRegexPattern(request: GeneratorRequest): GeneratorResultRecord {
	const preset = parseChoice(request.fields.preset ?? request.input, REGEX_PRESETS, "email");
	const flags = parseChoice(request.fields.flags ?? "", REGEX_FLAGS, "none");
	const regex = regexPreset(preset);
	const pattern = request.fields.anchors === "false" ? regex.pattern : `^${regex.pattern}$`;
	const normalizedFlags = flags === "none" ? "" : flags;

	return {
		description: regex.description,
		exampleMatch: regex.exampleMatch,
		exampleNonMatch: regex.exampleNonMatch,
		flags: normalizedFlags || "none",
		javascriptLiteral: `/${escapeRegexLiteral(pattern)}/${normalizedFlags}`,
		notes: "Curated linear-time pattern; still validate business rules separately.",
		pattern,
	};
}

function createCronExpression(request: GeneratorRequest): GeneratorResultRecord {
	const preset = parseChoice(request.fields.preset ?? request.input, CRON_PRESETS, "daily");
	const minute = parseInteger(request.fields.minute ?? "", 0, 0, 59);
	const hour = parseInteger(request.fields.hour ?? "", 9, 0, 23);
	const weekday = parseInteger(request.fields.weekday ?? "", 1, 0, 6);
	const day = parseInteger(request.fields.day ?? "", 1, 1, 31);

	switch (preset) {
		case "hourly":
			return {
				description: `Every hour at minute ${pad(minute)}`,
				expression: `${minute} * * * *`,
			};
		case "monthly":
			return {
				description: `Every month on day ${day} at ${pad(hour)}:${pad(minute)}`,
				expression: `${minute} ${hour} ${day} * *`,
			};
		case "weekly":
			return {
				description: `Every week on weekday ${weekday} at ${pad(hour)}:${pad(minute)}`,
				expression: `${minute} ${hour} * * ${weekday}`,
			};
		case "daily":
			return {
				description: `Every day at ${pad(hour)}:${pad(minute)}`,
				expression: `${minute} ${hour} * * *`,
			};
	}
}

function regexPreset(preset: (typeof REGEX_PRESETS)[number]): RegexPreset {
	switch (preset) {
		case "decimal":
			return {
				description: "Signed decimal number.",
				exampleMatch: "-12.75",
				exampleNonMatch: "12.",
				pattern: "[+-]?(?:\\d+\\.\\d+|\\d+)",
			};
		case "hex-colour":
			return {
				description: "CSS hex colour in 3, 4, 6, or 8 digit form.",
				exampleMatch: "#ff2f78",
				exampleNonMatch: "ff2f78",
				pattern: "#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})",
			};
		case "html-tag":
			return {
				description: "Simple HTML tag token.",
				exampleMatch: "<meta name=\"description\">",
				exampleNonMatch: "meta name=\"description\"",
				pattern: "<\\/?[A-Za-z][A-Za-z0-9-]*\\b[^<>]*>",
			};
		case "integer":
			return {
				description: "Signed base-10 integer.",
				exampleMatch: "-42",
				exampleNonMatch: "4.2",
				pattern: "[+-]?\\d+",
			};
		case "ipv4":
			return {
				description: "IPv4 address with octets from 0 to 255.",
				exampleMatch: "192.168.0.1",
				exampleNonMatch: "999.168.0.1",
				pattern: "(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)",
			};
		case "iso-date":
			return {
				description: "ISO-style calendar date.",
				exampleMatch: "2026-06-10",
				exampleNonMatch: "10/06/2026",
				pattern: "\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])",
			};
		case "slug":
			return {
				description: "Lowercase URL slug.",
				exampleMatch: "launch-notes-v2",
				exampleNonMatch: "Launch notes v2",
				pattern: "[a-z0-9]+(?:-[a-z0-9]+)*",
			};
		case "time":
			return {
				description: "24-hour time with minutes.",
				exampleMatch: "23:59",
				exampleNonMatch: "24:00",
				pattern: "(?:[01]\\d|2[0-3]):[0-5]\\d",
			};
		case "url":
			return {
				description: "HTTP or HTTPS URL.",
				exampleMatch: "https://pashi.app/tools",
				exampleNonMatch: "ftp://pashi.app/tools",
				pattern: "https?:\\/\\/[^\\s/$.?#][^\\s]*",
			};
		case "uuid":
			return {
				description: "UUID v4-style identifier.",
				exampleMatch: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
				exampleNonMatch: "f47ac10b58cc4372a5670e02b2c3d479",
				pattern: "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",
			};
		case "whitespace":
			return {
				description: "One or more whitespace characters.",
				exampleMatch: "   ",
				exampleNonMatch: "word",
				pattern: "\\s+",
			};
		case "email":
			return {
				description: "Practical email address shape, not full RFC validation.",
				exampleMatch: "ada@example.com",
				exampleNonMatch: "ada@example",
				pattern: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}",
			};
	}
}

function createJsonSchemaExample(request: GeneratorRequest) {
	const title = request.fields.title?.trim() || "Example";
	const fields = parseSchemaFields(request.fields.fields || request.input || "name:string");
	const required = fields.map((field) => field.name);
	const schema = {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		additionalProperties: false,
		properties: Object.fromEntries(fields.map((field) => [field.name, { type: field.type }])),
		required,
		title,
		type: "object",
	};

	return JSON.stringify(schema, null, 2);
}

function createHtmlMetaTags(request: GeneratorRequest) {
	const title = request.fields.title?.trim() || request.input || "Pashi";
	const description = request.fields.description?.trim() || "Fast tools and converters";
	const url = safeUrl(request.fields.url) || "https://pashi.app";
	const image = safeUrl(request.fields.image);
	const tags = [
		`<title>${escapeXml(title)}</title>`,
		`<meta name="description" content="${escapeXml(description)}">`,
		`<meta property="og:title" content="${escapeXml(title)}">`,
		`<meta property="og:description" content="${escapeXml(description)}">`,
		`<meta property="og:url" content="${escapeXml(url)}">`,
		`<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
	];
	if (image) {
		tags.push(`<meta property="og:image" content="${escapeXml(image)}">`);
	}

	return tags.join("\n");
}

function createTypeScriptInterface(request: GeneratorRequest) {
	const sample = parseJsonSample(request.fields.json || request.input || "{}");
	const name = pascalCase(request.fields.name || "Root");
	const shape = isRecord(sample) ? sample : { value: sample };
	const lines = Object.entries(shape).map(([key, value]) =>
		`  ${typescriptPropertyName(key)}: ${typescriptType(value)};`
	);

	return [`interface ${name} {`, ...lines, "}"].join("\n");
}

function createFetchSnippet(request: GeneratorRequest) {
	const url = safeUrl(request.fields.url) || "https://api.example.com/items";
	const method = requestMethod(request.fields.method);
	const body = jsonBody(request);
	const options = method === "GET" || method === "DELETE"
		? `{\n  method: "${method}",\n  headers: {\n    "Accept": "application/json"\n  }\n}`
		: `{\n  method: "${method}",\n  headers: {\n    "Accept": "application/json",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify(${body})\n}`;

	return [
		`const response = await fetch("${url}", ${options});`,
		"const data = await response.json();",
	].join("\n");
}

function createAxiosSnippet(request: GeneratorRequest) {
	const url = safeUrl(request.fields.url) || "https://api.example.com/items";
	const method = requestMethod(request.fields.method).toLowerCase();
	const body = jsonBody(request);
	if (method === "get" || method === "delete") {
		return `const response = await axios.${method}("${url}", {\n  headers: {\n    "Accept": "application/json"\n  }\n});`;
	}

	return `const response = await axios.${method}("${url}", ${body}, {\n  headers: {\n    "Accept": "application/json",\n    "Content-Type": "application/json"\n  }\n});`;
}

function createJsonApiResponse(request: GeneratorRequest) {
	const success = request.fields.success?.toLowerCase() !== "false";
	const status = parseInteger(request.fields.status ?? "", success ? 200 : 400, 100, 599);
	return JSON.stringify({
		data: parseJsonSample(request.input || request.fields.json || "{}"),
		error: success ? null : { message: "Request failed" },
		status,
		success,
	}, null, 2);
}

function parseSchemaFields(input: string) {
	return input
		.split(/\r?\n|,/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [rawName = "value", rawType = "string"] = line.split(/\s*:\s*/);
			return {
				name: safePropertyName(rawName),
				type: schemaType(rawType),
			};
		});
}

function schemaType(value: string) {
	const normalised = value.toLowerCase();
	return normalised === "number" || normalised === "integer" || normalised === "boolean" || normalised === "array" || normalised === "object" || normalised === "null"
		? normalised
		: "string";
}

function safePropertyName(value: string) {
	const name = value.trim().replace(/[^\w.-]/g, "_");
	return name || "value";
}

function safeUrl(value: string | undefined) {
	if (!value?.trim()) {
		return undefined;
	}

	try {
		const url = new URL(value.trim());
		return url.protocol === "http:" || url.protocol === "https:" ? value.trim() : undefined;
	} catch {
		return undefined;
	}
}

function pad(value: number) {
	return String(value).padStart(2, "0");
}

function escapeRegexLiteral(pattern: string) {
	return pattern.replace(/\\/g, "\\\\").replace(/\//g, "\\/");
}

function parseJsonSample(input: string): unknown {
	try {
		return JSON.parse(input);
	} catch {
		return input;
	}
}

function jsonBody(request: GeneratorRequest) {
	return JSON.stringify(parseJsonSample(request.input || request.fields.json || "{}"), null, 2);
}

function requestMethod(value: string | undefined) {
	return parseChoice(value ?? "", ["get", "post", "put", "patch", "delete"] as const, "post").toUpperCase();
}

function typescriptType(value: unknown): string {
	if (Array.isArray(value)) {
		const sample = value.find((item) => item !== null);
		return sample === undefined ? "unknown[]" : `${typescriptType(sample)}[]`;
	}
	if (isRecord(value)) {
		const fields = Object.entries(value).map(([key, item]) =>
			`${typescriptPropertyName(key)}: ${typescriptType(item)}`
		);
		return `{ ${fields.join("; ")} }`;
	}
	if (value === null) {
		return "null";
	}
	if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
		return typeof value;
	}

	return "unknown";
}

function typescriptPropertyName(value: string) {
	return /^[A-Za-z_$][\w$]*$/.test(value) ? value : JSON.stringify(value);
}

function pascalCase(value: string) {
	const words = value.match(/[A-Za-z0-9]+/g) ?? ["Root"];
	return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("") || "Root";
}
