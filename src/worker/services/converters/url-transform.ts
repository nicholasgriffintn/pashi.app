export type UrlTransformFormat =
	| "dedupe-links"
	| "extract-emails"
	| "extract-links"
	| "parse"
	| "query";

export const URL_TRANSFORM_FORMATS: readonly UrlTransformFormat[] = [
	"parse",
	"query",
	"extract-links",
	"extract-emails",
	"dedupe-links",
];

export class UrlTransformError extends Error {}

export function isUrlTransformFormat(value: string): value is UrlTransformFormat {
	return URL_TRANSFORM_FORMATS.some((format) => format === value);
}

export function transformUrl(input: string, format: UrlTransformFormat) {
	switch (format) {
		case "dedupe-links":
			return uniqueValues(extractLinks(input)).join("\n");
		case "extract-emails":
			return uniqueValues(extractEmails(input)).join("\n");
		case "extract-links":
			return extractLinks(input).join("\n");
		case "parse":
			return JSON.stringify(parseUrl(input), null, 2);
		case "query":
			return JSON.stringify(queryParams(parseHttpUrl(input).searchParams), null, 2);
	}
}

function parseUrl(input: string) {
	const url = parseHttpUrl(input);
	return {
		hash: url.hash,
		host: url.host,
		hostname: url.hostname,
		href: url.href,
		origin: url.origin,
		pathname: url.pathname,
		port: url.port,
		protocol: url.protocol,
		search: url.search,
	};
}

function queryParams(params: URLSearchParams) {
	const values: Record<string, string | string[]> = {};
	for (const [key, value] of params.entries()) {
		const existing = values[key];
		if (existing === undefined) {
			values[key] = value;
		} else if (Array.isArray(existing)) {
			existing.push(value);
		} else {
			values[key] = [existing, value];
		}
	}

	return values;
}

function parseHttpUrl(input: string) {
	try {
		const url = new URL(input.trim());
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			throw new UrlTransformError("Enter an HTTP or HTTPS URL.");
		}

		return url;
	} catch (error) {
		if (error instanceof UrlTransformError) {
			throw error;
		}

		throw new UrlTransformError("Enter a valid URL.");
	}
}

function extractLinks(input: string) {
	return (input.match(/https?:\/\/[^\s<>"']+/gi) ?? []).map(cleanUrlMatch);
}

function extractEmails(input: string) {
	return input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
}

function cleanUrlMatch(value: string) {
	return value.replace(/[),.;!?]+$/g, "");
}

function uniqueValues(values: readonly string[]) {
	return [...new Set(values)];
}
