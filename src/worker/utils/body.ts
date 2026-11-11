import type { Context } from "hono";

import { PayloadTooLargeError, UploadTooLargeError } from "./http";

const BODY_INPUT_FIELD_IDS = new Set(["data", "file", "input"]);
const MAX_TEXT_BODY_BYTES = 1024 * 1024;
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

export const MAX_CONVERTER_UPLOAD_BYTES = 5 * 1024 * 1024;

type TooLargeError = () => PayloadTooLargeError;

function assertDeclaredSizeWithinLimit(c: Context, limit: number, tooLarge: TooLargeError) {
	const declared = Number(c.req.header("content-length") ?? "");

	if (Number.isFinite(declared) && declared > limit) {
		throw tooLarge();
	}
}

async function readBoundedBytes(
	c: Context,
	limit: number,
	tooLarge: TooLargeError = () => new PayloadTooLargeError(limit),
) {
	assertDeclaredSizeWithinLimit(c, limit, tooLarge);

	const body = c.req.raw.body;

	if (!body) {
		return new Uint8Array(0);
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
				throw tooLarge();
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

	return merged;
}

async function readBoundedText(c: Context, limit = MAX_TEXT_BODY_BYTES) {
	return new TextDecoder().decode(await readBoundedBytes(c, limit));
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

export interface UploadedFile {
	bytes: Uint8Array<ArrayBuffer>;
	name: string;
	type: string;
}

export interface ToolBody {
	fields: Record<string, string>;
	file?: UploadedFile;
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
		assertDeclaredSizeWithinLimit(
			c,
			MAX_TEXT_BODY_BYTES,
			() => new PayloadTooLargeError(MAX_TEXT_BODY_BYTES),
		);

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

export async function readConverterUploadBody(
	c: Context,
	limit = MAX_CONVERTER_UPLOAD_BYTES,
): Promise<ToolBody> {
	const queryFields = fieldsFromSearchParams(new URL(c.req.url).searchParams);
	const contentType = c.req.header("content-type") ?? "";
	const mediaType = contentType.split(";")[0].trim().toLowerCase();
	const tooLarge = () => new UploadTooLargeError(limit);

	if (mediaType === "application/octet-stream") {
		return {
			fields: queryFields,
			file: {
				bytes: await readBoundedBytes(c, limit, tooLarge),
				name: queryFields.sourceName ?? "",
				type: mediaType,
			},
			input: "",
		};
	}

	if (mediaType !== "multipart/form-data") {
		return readConverterBody(c);
	}

	const bytes = await readBoundedBytes(c, limit + MULTIPART_OVERHEAD_BYTES, tooLarge);
	const formData = await parseFormData(bytes, contentType);

	if (!formData) {
		return { fields: queryFields, input: "" };
	}

	const fields = { ...queryFields, ...fieldsFromFormData(formData) };
	const file = formData.get("file");

	if (!(file instanceof File)) {
		return { fields, input: "" };
	}

	if (file.size > limit) {
		throw tooLarge();
	}

	if (!fields.sourceName && file.name) {
		fields.sourceName = file.name;
	}

	return {
		fields,
		file: {
			bytes: new Uint8Array(await file.arrayBuffer()),
			name: file.name || fields.sourceName || "",
			type: file.type,
		},
		input: "",
	};
}

async function parseFormData(bytes: Uint8Array<ArrayBuffer>, contentType: string) {
	try {
		return await new Response(bytes, { headers: { "Content-Type": contentType } }).formData();
	} catch {
		return undefined;
	}
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
