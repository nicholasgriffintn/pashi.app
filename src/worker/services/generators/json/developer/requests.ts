import type { GeneratorRequest } from "../../request.ts";
import { parseChoice } from "../../../../utils/generation.ts";
import { safeHttpUrl } from "../../../../utils/text.ts";

interface RequestShape {
	body: string;
	headers: Record<string, string>;
	method: string;
	url: string;
}

export function createAxiosSnippet(request: GeneratorRequest) {
	const shape = createRequestShape(request);
	const method = shape.method.toLowerCase();
	if (method === "get" || method === "delete") {
		return `const response = await axios.${method}("${shape.url}", {\n  headers: ${jsonBlock(shape.headers, 2)}\n});`;
	}

	return `const response = await axios.${method}("${shape.url}", ${shape.body}, {\n  headers: ${jsonBlock(shape.headers, 2)}\n});`;
}

export function createCurlCommand(request: GeneratorRequest) {
	const shape = createRequestShape(request);
	const lines = [
		"curl",
		`  -X ${shellQuote(shape.method)}`,
		...Object.entries(shape.headers).map(([name, value]) => `  -H ${shellQuote(`${name}: ${value}`)}`),
		requiresRequestBody(shape.method) ? `  --data-raw ${shellQuote(shape.body)}` : "",
		`  ${shellQuote(shape.url)}`,
	].filter(Boolean);

	return lines.join(" \\\n");
}

export function createFetchSnippet(request: GeneratorRequest) {
	const shape = createRequestShape(request);
	const options = requiresRequestBody(shape.method)
		? `{\n  method: "${shape.method}",\n  headers: ${jsonBlock(shape.headers, 2)},\n  body: JSON.stringify(${expressionBlock(shape.body, 2)})\n}`
		: `{\n  method: "${shape.method}",\n  headers: ${jsonBlock(shape.headers, 2)}\n}`;

	return [
		`const response = await fetch("${shape.url}", ${options});`,
		"const data = await response.json();",
	].join("\n");
}

export function createHarRequest(request: GeneratorRequest) {
	const shape = createRequestShape(request);
	const har = {
		log: {
			entries: [
				{
					request: {
						headers: Object.entries(shape.headers).map(([name, value]) => ({ name, value })),
						method: shape.method,
						postData: requiresRequestBody(shape.method)
							? {
								mimeType: shape.headers["Content-Type"] ?? "application/json",
								text: shape.body,
							}
							: undefined,
						url: shape.url,
					},
				},
			],
			version: "1.2",
		},
	};

	return JSON.stringify(har, null, 2);
}

export function createHttpRequestExample(request: GeneratorRequest) {
	const shape = createRequestShape(request);
	const url = new URL(shape.url);
	const target = `${url.pathname}${url.search}`;
	const lines = [
		`${shape.method} ${target || "/"} HTTP/1.1`,
		`Host: ${url.host}`,
		...Object.entries(shape.headers).map(([name, value]) => `${name}: ${value}`),
		requiresRequestBody(shape.method) ? `\n${shape.body}` : "",
	];

	return lines.join("\n");
}

export function createJsonApiResponse(request: GeneratorRequest) {
	const success = request.fields.success?.toLowerCase() !== "false";
	const status = parseStatus(request.fields.status, success ? 200 : 400);
	return JSON.stringify({
		data: parseJsonSample(request.input || request.fields.json || "{}"),
		error: success ? null : { message: "Request failed" },
		status,
		success,
	}, null, 2);
}

function createRequestShape(request: GeneratorRequest): RequestShape {
	const method = requestMethod(request.fields.method);
	const body = jsonBody(request);
	return {
		body,
		headers: requestHeaders(request, method),
		method,
		url: safeHttpUrl(request.fields.url) || "https://api.example.com/items",
	};
}

function requestHeaders(request: GeneratorRequest, method: string) {
	const headers = parseHeaders(request.fields.headers);
	if (!headers.Accept) {
		headers.Accept = "application/json";
	}
	if (requiresRequestBody(method) && !headers["Content-Type"]) {
		headers["Content-Type"] = "application/json";
	}

	return headers;
}

function parseHeaders(input: string | undefined) {
	const headers: Record<string, string> = {};
	for (const line of (input ?? "").split(/\r?\n/)) {
		const match = /^([^:]+):\s*(.+)$/.exec(line.trim());
		if (!match) {
			continue;
		}
		headers[match[1].trim()] = match[2].trim();
	}

	return headers;
}

function jsonBody(request: GeneratorRequest) {
	return JSON.stringify(parseJsonSample(request.input || request.fields.json || "{}"), null, 2);
}

function parseJsonSample(input: string): unknown {
	try {
		return JSON.parse(input);
	} catch {
		return input;
	}
}

function requestMethod(value: string | undefined) {
	return parseChoice(value ?? "", ["get", "post", "put", "patch", "delete"] as const, "post").toUpperCase();
}

function requiresRequestBody(method: string) {
	return method !== "GET" && method !== "DELETE";
}

function parseStatus(value: string | undefined, fallback: number) {
	const parsed = Number.parseInt(value ?? "", 10);
	return Number.isInteger(parsed) && parsed >= 100 && parsed <= 599 ? parsed : fallback;
}

function jsonBlock(value: unknown, indent: number) {
	const padding = " ".repeat(indent);
	return JSON.stringify(value, null, 2)
		.split("\n")
		.map((line, index) => index === 0 ? line : `${padding}${line}`)
		.join("\n");
}

function expressionBlock(value: string, indent: number) {
	const padding = " ".repeat(indent);
	return value
		.split("\n")
		.map((line, index) => index === 0 ? line : `${padding}${line}`)
		.join("\n");
}

function shellQuote(value: string) {
	return `'${value.replace(/'/g, "'\\''")}'`;
}
