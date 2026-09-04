import type { Context } from "hono";

import { PayloadTooLargeError } from "./http";

const BODY_INPUT_FIELD_IDS = new Set(["data", "file", "input"]);
const MAX_TEXT_BODY_BYTES = 1024 * 1024;

function assertDeclaredSizeWithinLimit(c: Context, limit: number) {
	const declared = Number(c.req.header("content-length") ?? "");

	if (Number.isFinite(declared) && declared > limit) {
		throw new PayloadTooLargeError(limit);
	}
}

async function readBoundedText(c: Context, limit = MAX_TEXT_BODY_BYTES) {
	assertDeclaredSizeWithinLimit(c, limit);

	const body = c.req.raw.body;

	if (!body) {
		return "";
	}

	const reader = body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;

	try {
		for (;;) {
			const { done, value } = await reader.read();

			if (done) {
				break;
			}

			size += value.byteLength;

			if (size > limit) {
				throw new PayloadTooLargeError(limit);
			}

			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	const merged = new Uint8Array(size);
	let offset = 0;

	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return new TextDecoder().decode(merged);
}

async function readBoundedJson(c: Context) {
	const text = await readBoundedText(c);

	if (!text) {
		return undefined;
	}

	try {
		return JSON.parse(text) as unknown;
	} catch {
		return undefined;
	}
}

export interface ToolBody {
	fields: Record<string, string>;
	input: string;
}

export async function readGeneratorBody(c: Context): Promise<ToolBody> {
	const body = await readBoundedJson(c);

	if (body === undefined) {
		return { fields: {}, input: "" };
	}

	return {
		fields: fieldsFromJsonBody(body),
		input: isInputBody(body) ? body.input : "",
	};
}

export async function readConverterBody(c: Context): Promise<ToolBody> {
	const params = new URL(c.req.url).searchParams;
	const queryFields = fieldsFromSearchParams(params);
	const contentType = c.req.header("content-type")?.toLowerCase() ?? "";
	const queryInput = params.get("input") || params.get("data") || "";

	if (contentType.includes("application/json")) {
		const body = await readBoundedJson(c);

		if (body === undefined) {
			return { fields: queryFields, input: "" };
		}

		return {
			fields: {
				...queryFields,
				...fieldsFromJsonBody(body),
			},
			input: isInputBody(body) ? body.input : queryInput,
		};
	}

	if (contentType.includes("multipart/form-data")) {
		assertDeclaredSizeWithinLimit(c, MAX_TEXT_BODY_BYTES);

		try {
			return bodyFromFormData(await c.req.formData(), queryFields, queryInput);
		} catch (error) {
			if (error instanceof PayloadTooLargeError) {
				throw error;
			}

			return { fields: queryFields, input: queryInput };
		}
	}

	if (contentType.includes("application/x-www-form-urlencoded")) {
		const bodyParams = new URLSearchParams(await readBoundedText(c));

		return {
			fields: {
				...queryFields,
				...fieldsFromSearchParams(bodyParams),
			},
			input: bodyParams.get("input") || bodyParams.get("data") || queryInput,
		};
	}

	const input = await readBoundedText(c);

	return {
		fields: queryFields,
		input: input || queryInput,
	};
}

export function isInputBody(value: unknown): value is { input: string } {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		"input" in value &&
		typeof value.input === "string"
	);
}

export function normaliseFields(value: unknown) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(value).flatMap(([key, fieldValue]) =>
			typeof fieldValue === "string" ? [[key, fieldValue]] : [],
		),
	);
}

export function fieldsFromJsonBody(value: unknown) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return {};
	}

	return {
		...fieldsFromObject(value),
		...("fields" in value ? normaliseFields(value.fields) : {}),
	};
}

export function fieldsFromSearchParams(params: URLSearchParams) {
	return Object.fromEntries(
		[...params.entries()].filter(([key]) => !BODY_INPUT_FIELD_IDS.has(key)),
	);
}

export async function bodyFromFormData(
	formData: FormData,
	queryFields: Record<string, string> = {},
	fallbackInput = "",
): Promise<ToolBody> {
	const fields = {
		...queryFields,
		...fieldsFromFormData(formData),
	};
	const file = formData.get("file");

	if (file instanceof File) {
		if (!fields.sourceName && file.name) {
			fields.sourceName = file.name;
		}

		return {
			fields,
			input: await file.text(),
		};
	}

	return {
		fields,
		input: stringFormField(formData, "input") || stringFormField(formData, "data") || fallbackInput,
	};
}

export function fieldsFromFormData(formData: FormData) {
	const fields: Record<string, string> = {};

	for (const [key, value] of formData.entries()) {
		if (BODY_INPUT_FIELD_IDS.has(key) || typeof value !== "string") {
			continue;
		}

		fields[key] = value;
	}

	return fields;
}

function stringFormField(formData: FormData, key: string) {
	const value = formData.get(key);

	return typeof value === "string" ? value : "";
}

function fieldsFromObject(value: object) {
	return Object.fromEntries(
		Object.entries(value).flatMap(([key, fieldValue]) =>
			!BODY_INPUT_FIELD_IDS.has(key) && typeof fieldValue === "string" ? [[key, fieldValue]] : [],
		),
	);
}
