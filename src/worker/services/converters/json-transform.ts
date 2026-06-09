import { isRecord } from "../../../shared/records.ts";

export type JsonTransformFormat =
	| "base64"
	| "escape"
	| "flatten"
	| "format"
	| "from-base64"
	| "keys"
	| "minify"
	| "sort"
	| "unescape";

export const JSON_TRANSFORM_FORMATS: readonly JsonTransformFormat[] = [
	"format",
	"minify",
	"sort",
	"flatten",
	"keys",
	"base64",
	"from-base64",
	"escape",
	"unescape",
];

export class JsonTransformError extends Error {}

export function isJsonTransformFormat(value: string): value is JsonTransformFormat {
	return JSON_TRANSFORM_FORMATS.some((format) => format === value);
}

export function transformJson(input: string, format: JsonTransformFormat) {
	switch (format) {
		case "base64":
			return bytesToBase64(new TextEncoder().encode(input));
		case "escape":
			return input.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
		case "flatten":
			return JSON.stringify(flattenJson(parseJson(input)), null, 2);
		case "format":
			return JSON.stringify(parseJson(input), null, 2);
		case "from-base64":
			return base64ToText(input);
		case "keys":
			return jsonKeys(parseJson(input)).sort().join("\n");
		case "minify":
			return JSON.stringify(parseJson(input));
		case "sort":
			return JSON.stringify(sortJson(parseJson(input)), null, 2);
		case "unescape":
			return input.replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
	}
}

function parseJson(input: string): unknown {
	try {
		return JSON.parse(input);
	} catch {
		throw new JsonTransformError("Enter valid JSON.");
	}
}

function sortJson(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sortJson);
	}
	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, item]) => [key, sortJson(item)]),
		);
	}

	return value;
}

function flattenJson(value: unknown) {
	const flattened: Record<string, unknown> = {};
	visitJson(value, "", (path, item) => {
		if (path && !isContainer(item)) {
			flattened[path] = item;
		}
	});

	return sortJson(flattened);
}

function jsonKeys(value: unknown) {
	const keys: string[] = [];
	visitJson(value, "", (path) => {
		if (path) {
			keys.push(path);
		}
	});

	return keys;
}

function visitJson(value: unknown, path: string, visit: (path: string, value: unknown) => void) {
	visit(path, value);
	if (Array.isArray(value)) {
		value.forEach((item, index) => {
			visitJson(item, childPath(path, String(index)), visit);
		});
		return;
	}
	if (isRecord(value)) {
		for (const [key, item] of Object.entries(value)) {
			visitJson(item, childPath(path, key), visit);
		}
	}
}

function childPath(parent: string, key: string) {
	return parent ? `${parent}.${key}` : key;
}

function isContainer(value: unknown) {
	return Array.isArray(value) || isRecord(value);
}

function bytesToBase64(bytes: Uint8Array) {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCodePoint(byte);
	}
	return btoa(binary);
}

function base64ToText(value: string) {
	try {
		const binary = atob(value.trim());
		return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0));
	} catch {
		throw new JsonTransformError("Enter valid base64 text.");
	}
}
