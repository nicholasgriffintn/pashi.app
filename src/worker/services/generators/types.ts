export type Audience = "Design" | "Engineering" | "Product";
export type ResultKind = "fields" | "image" | "palette" | "text";
export type GeneratorResultValue = string | string[] | Record<string, string>;

export interface GeneratorTool {
	audience: Audience;
	description: string;
	endpoint: string;
	id: string;
	input: {
		label: string;
		required: boolean;
	};
	label: string;
	placeholder: string;
	result: {
		kind: ResultKind;
	};
}

export interface JsonResult {
	input: string;
	kind: Exclude<ResultKind, "image">;
	label: string;
	meta: string;
	result: GeneratorResultValue;
	type: string;
}
