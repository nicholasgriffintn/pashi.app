import { type Context } from "hono";

const BODY_INPUT_FIELD_IDS = new Set(["data", "file", "input"]);

export interface ToolBody {
	fields: Record<string, string>;
	input: string;
}

export async function readInputBody(c: Context) {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return "";
	}

	return isInputBody(body) ? body.input : "";
}

export async function readGeneratorBody(c: Context): Promise<ToolBody> {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
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
		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
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
		try {
			return bodyFromFormData(await c.req.formData(), queryFields, queryInput);
		} catch {
			return { fields: queryFields, input: queryInput };
		}
	}

	if (contentType.includes("application/x-www-form-urlencoded")) {
		const bodyParams = new URLSearchParams(await c.req.text());
		return {
			fields: {
				...queryFields,
				...fieldsFromSearchParams(bodyParams),
			},
			input: bodyParams.get("input") || bodyParams.get("data") || queryInput,
		};
	}

	const input = await c.req.text();
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
