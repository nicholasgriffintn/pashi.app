import { isRecord } from "../../../shared/records.ts";

export type RequestTransformFormat =
	| "curl-to-fetch"
	| "curl-to-json"
	| "har-to-curl"
	| "request-to-curl";

export const REQUEST_TRANSFORM_FORMATS: readonly RequestTransformFormat[] = [
	"curl-to-fetch",
	"curl-to-json",
	"har-to-curl",
	"request-to-curl",
];

export class RequestTransformError extends Error {}

interface HttpRequestShape {
	body?: string;
	headers: Record<string, string>;
	method: string;
	url: string;
}

export function isRequestTransformFormat(value: string): value is RequestTransformFormat {
	return REQUEST_TRANSFORM_FORMATS.some((format) => format === value);
}

export function transformRequestText(input: string, format: RequestTransformFormat) {
	switch (format) {
		case "curl-to-fetch":
			return requestToFetch(parseCurl(input));
		case "curl-to-json":
			return JSON.stringify(parseCurl(input), null, 2);
		case "har-to-curl":
			return requestToCurl(parseHar(input));
		case "request-to-curl":
			return requestToCurl(parseRequestText(input));
	}
}

function parseCurl(input: string): HttpRequestShape {
	const tokens = shellTokens(input);
	if (tokens[0] !== "curl") {
		throw new RequestTransformError("Enter a curl command that starts with curl.");
	}

	const request: HttpRequestShape = {
		headers: {},
		method: "GET",
		url: "",
	};

	for (let index = 1; index < tokens.length; index += 1) {
		const token = tokens[index];
		const next = tokens[index + 1];
		if (!token) {
			continue;
		}

		if ((token === "-X" || token === "--request") && next) {
			request.method = next.toUpperCase();
			index += 1;
			continue;
		}

		if ((token === "-H" || token === "--header") && next) {
			const header = parseHeader(next);
			if (header) {
				request.headers[header.name] = header.value;
			}
			index += 1;
			continue;
		}

		if ((token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary") && next) {
			request.body = next;
			if (request.method === "GET") {
				request.method = "POST";
			}
			index += 1;
			continue;
		}

		if ((token === "-u" || token === "--user") && next) {
			request.headers.Authorization = `Basic ${btoa(next)}`;
			index += 1;
			continue;
		}

		if (!token.startsWith("-")) {
			request.url = token;
		}
	}

	if (!request.url) {
		throw new RequestTransformError("Enter a curl command with a URL.");
	}

	return request;
}

function parseHar(input: string): HttpRequestShape {
	const value = parseJson(input);
	const entry = isRecord(value) && isRecord(value.log) && Array.isArray(value.log.entries)
		? value.log.entries[0]
		: value;
	const request = isRecord(entry) && isRecord(entry.request) ? entry.request : entry;
	if (!isRecord(request)) {
		throw new RequestTransformError("Enter a HAR request object or HAR log with at least one entry.");
	}

	const headers = Array.isArray(request.headers)
		? Object.fromEntries(
			request.headers
				.filter((header): header is Record<string, unknown> => isRecord(header))
				.map((header) => [String(header.name ?? ""), String(header.value ?? "")])
				.filter(([name]) => name),
		)
		: {};
	const postData = isRecord(request.postData) && typeof request.postData.text === "string"
		? request.postData.text
		: undefined;
	const url = typeof request.url === "string" ? request.url : "";
	if (!url) {
		throw new RequestTransformError("Enter a HAR request with a URL.");
	}

	return {
		body: postData,
		headers,
		method: String(request.method ?? (postData ? "POST" : "GET")).toUpperCase(),
		url,
	};
}

function parseRequestText(input: string): HttpRequestShape {
	const asJson = maybeParseRequestJson(input);
	if (asJson) {
		return asJson;
	}

	const [head, ...bodyParts] = input.split(/\r?\n\r?\n/);
	const lines = head.split(/\r?\n/).filter(Boolean);
	const [requestLine, ...headerLines] = lines;
	const requestMatch = /^([A-Z]+)\s+(\S+)(?:\s+HTTP\/\d(?:\.\d)?)?$/i.exec(requestLine ?? "");
	if (!requestMatch) {
		throw new RequestTransformError("Enter raw HTTP request text or a JSON request object.");
	}

	const headers = Object.fromEntries(
		headerLines
			.map(parseHeader)
			.filter((header): header is { name: string; value: string } => Boolean(header))
			.map((header) => [header.name, header.value]),
	);
	const host = headers.Host ?? headers.host;
	const target = requestMatch[2];
	const url = /^https?:\/\//i.test(target)
		? target
		: `https://${host || "example.com"}${target.startsWith("/") ? target : `/${target}`}`;
	const body = bodyParts.join("\n\n");
	return {
		body: body || undefined,
		headers,
		method: requestMatch[1].toUpperCase(),
		url,
	};
}

function maybeParseRequestJson(input: string): HttpRequestShape | undefined {
	let value: unknown;
	try {
		value = JSON.parse(input);
	} catch {
		return undefined;
	}

	if (!isRecord(value) || typeof value.url !== "string") {
		return undefined;
	}

	const headers = isRecord(value.headers)
		? Object.fromEntries(Object.entries(value.headers).map(([key, item]) => [key, String(item)]))
		: {};
	return {
		body: typeof value.body === "string" ? value.body : undefined,
		headers,
		method: typeof value.method === "string" ? value.method.toUpperCase() : "GET",
		url: value.url,
	};
}

function requestToCurl(request: HttpRequestShape) {
	const lines = [
		"curl",
		`  -X ${shellQuote(request.method)}`,
		...Object.entries(request.headers).map(([name, value]) => `  -H ${shellQuote(`${name}: ${value}`)}`),
		request.body ? `  --data-raw ${shellQuote(request.body)}` : "",
		`  ${shellQuote(request.url)}`,
	].filter(Boolean);
	return lines.join(" \\\n");
}

function requestToFetch(request: HttpRequestShape) {
	const init: Record<string, unknown> = {
		method: request.method,
	};
	if (Object.keys(request.headers).length > 0) {
		init.headers = request.headers;
	}
	if (request.body) {
		init.body = request.body;
	}

	return `const response = await fetch(${JSON.stringify(request.url)}, ${JSON.stringify(init, null, 2)});\nconst data = await response.text();`;
}

function parseHeader(value: string | undefined) {
	const match = /^([^:]+):\s*([\s\S]*)$/.exec(value ?? "");
	if (!match) {
		return undefined;
	}

	return {
		name: match[1].trim(),
		value: match[2].trim(),
	};
}

function parseJson(input: string): unknown {
	try {
		return JSON.parse(input);
	} catch {
		throw new RequestTransformError("Enter valid HAR JSON.");
	}
}

function shellTokens(input: string) {
	const tokens: string[] = [];
	let current = "";
	let quote: "\"" | "'" | undefined;
	let escaping = false;

	for (const char of input) {
		if (escaping) {
			current += char;
			escaping = false;
			continue;
		}

		if (char === "\\") {
			escaping = true;
			continue;
		}

		if (quote) {
			if (char === quote) {
				quote = undefined;
			} else {
				current += char;
			}
			continue;
		}

		if (char === "\"" || char === "'") {
			quote = char;
			continue;
		}

		if (/\s/.test(char)) {
			if (current) {
				tokens.push(current);
				current = "";
			}
			continue;
		}

		current += char;
	}

	if (current) {
		tokens.push(current);
	}

	return tokens;
}

function shellQuote(value: string) {
	return `'${value.replace(/'/g, "'\\''")}'`;
}
