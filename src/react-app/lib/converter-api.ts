import { fetchPashiInfo, type FeatureStatusMap, type ServiceStatusMap } from "./pashi-info.ts";

export type ConverterStatus = "available";
export type ConverterRuntime = "container" | "worker";
export type ConverterMethod = "GET" | "POST";

export interface ConverterApiField {
	description: string;
	id: string;
	required?: boolean;
	values?: string[];
}

export interface ConverterApiExample {
	body?: string;
	contentType?: string;
	description: string;
	method: ConverterMethod;
	url: string;
}

export interface ConverterApiContract {
	accepts: string[];
	examples: ConverterApiExample[];
	fields: ConverterApiField[];
	methods: ConverterMethod[];
	response: "binary" | "json";
}

export interface ConverterInfoTool {
	aliases: string[];
	api?: ConverterApiContract;
	audience: "Documents" | "Media";
	description: string;
	display: {
		actionLabel: string;
		category: string;
		examples: string[];
	};
	endpoint?: string;
	id: string;
	input: {
		accept?: string[];
		label: string;
		kind: "file" | "text";
		required: boolean;
	};
	label: string;
	outputs: string[];
	placeholder: string;
	runtime: ConverterRuntime;
	status: ConverterStatus;
	toolType?: string;
}

export interface ConverterInfo {
	features: FeatureStatusMap;
	name: string;
	services: ServiceStatusMap;
	tools: ConverterInfoTool[];
}

type ApiInfoTool = ConverterInfoTool & {
	toolType?: string;
};

function isConverterInfoTool(tool: ApiInfoTool): tool is ConverterInfoTool {
	return tool.toolType === "converter";
}

export interface ConvertResult {
	downloadName?: string;
	generatedAt?: string;
	input: string;
	kind: "fields" | "text";
	label: string;
	meta: string;
	mimeType?: string;
	result: Record<string, string> | string;
	type: string;
}

export function conversionJobStatus(result: ConvertResult) {
	if (result.kind !== "fields" || typeof result.result === "string" || Array.isArray(result.result)) {
		return undefined;
	}

	return typeof result.result.status === "string" ? result.result.status : undefined;
}

export function conversionJobStatusUrl(result: ConvertResult) {
	if (result.kind !== "fields" || typeof result.result === "string" || Array.isArray(result.result)) {
		return undefined;
	}

	return typeof result.result.statusUrl === "string" && result.result.statusUrl
		? result.result.statusUrl
		: undefined;
}

export function isPendingConversionJob(result: ConvertResult) {
	const status = conversionJobStatus(result);
	return status === "processing" || status === "queued";
}

export async function fetchConverterInfo(): Promise<ConverterInfo> {
	const body = await fetchPashiInfo<ApiInfoTool>();
	if (!("tools" in body)) {
		throw new Error("Could not load converters.");
	}

	return {
		...body,
		tools: body.tools.filter(isConverterInfoTool),
	};
}

export async function fetchConversionJob(statusUrl: string): Promise<ConvertResult> {
	const response = await fetch(statusUrl);
	const body = (await response.json()) as ConvertResult | { error?: string };
	if (!response.ok) {
		throw new Error("error" in body && body.error ? body.error : "Could not load conversion job.");
	}

	return body as ConvertResult;
}

export async function convertThing(
	endpoint: string,
	input: string,
	fields: Record<string, string> = {},
): Promise<ConvertResult> {
	const response = await fetch(endpoint, {
		body: JSON.stringify({ fields, input }),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});

	const body = (await response.json()) as ConvertResult | { error?: string };
	if (!response.ok) {
		throw new Error("error" in body && body.error ? body.error : "Conversion failed.");
	}

	return body as ConvertResult;
}

export async function convertFileThing(
	endpoint: string,
	file: File,
	fields: Record<string, string> = {},
): Promise<ConvertResult> {
	const formData = new FormData();
	formData.set("file", file);
	for (const [key, value] of Object.entries(fields)) {
		if (value) {
			formData.set(key, value);
		}
	}

	const response = await fetch(endpoint, {
		body: formData,
		method: "POST",
	});

	const body = (await response.json()) as ConvertResult | { error?: string };
	if (!response.ok) {
		throw new Error("error" in body && body.error ? body.error : "Conversion failed.");
	}

	return body as ConvertResult;
}

export async function convertImageThing(
	endpoint: string,
	input: string,
	fields: Record<string, string>,
): Promise<Blob> {
	const response = await fetch(endpoint, {
		body: JSON.stringify({ fields, input }),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as { error?: string };
		throw new Error(body.error || "Image conversion failed.");
	}

	return response.blob();
}
