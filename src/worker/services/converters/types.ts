export type ConverterAudience = "Documents" | "Media";
export type ConverterInputKind = "file" | "text";
export type ConverterMethod = "GET" | "POST";
export type ConverterRuntime = "container" | "worker";
export type ConverterStatus = "available";
export type ConverterApiFieldControl = "effect-presets" | "select" | "source-presets" | "text";
export type ConverterApiFieldWidth = "auto" | "full";

export interface ConverterApiFieldDisplay {
	control?: ConverterApiFieldControl;
	width?: ConverterApiFieldWidth;
}

export interface ConverterApiField {
	defaultValue?: string;
	description: string;
	display?: ConverterApiFieldDisplay;
	id: string;
	required?: boolean;
	values?: readonly string[];
}

export interface ConverterApiExample {
	body?: string;
	contentType?: string;
	description: string;
	method: ConverterMethod;
	url: string;
}

export interface ConverterApiContract {
	accepts: readonly string[];
	examples: readonly ConverterApiExample[];
	fields: readonly ConverterApiField[];
	methods: readonly ConverterMethod[];
	response: "binary" | "json";
}

export interface ConverterTool {
	aliases: readonly string[];
	api?: ConverterApiContract;
	audience: ConverterAudience;
	description: string;
	display: {
		actionLabel: string;
		category: string;
		examples: readonly string[];
	};
	endpoint?: string;
	id: string;
	input: {
		accept?: readonly string[];
		label: string;
		kind: ConverterInputKind;
		required: boolean;
	};
	label: string;
	outputs: readonly string[];
	runtime: ConverterRuntime;
	placeholder: string;
	status: ConverterStatus;
}

export interface ConverterResult {
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

export interface ConverterRequest {
	fields: Record<string, string>;
	input: string;
}

export type ConverterHandler = (request: ConverterRequest) => ConverterResult;
