export type Audience =
	| "Design"
	| "Engineering"
	| "Gaming"
	| "Geographic"
	| "Identifiers"
	| "People"
	| "Product"
	| "Random"
	| "Security"
	| "Strings"
	| "TestData"
	| "Tools";
export type ResultKind = "fields" | "image" | "palette" | "text";
export type GeneratorResultRecord = Record<string, string>;
export type GeneratorResultValue = string | string[] | GeneratorResultRecord | GeneratorResultRecord[];

export interface GeneratorInputField {
	id: string;
	label: string;
	options?: readonly string[];
	placeholder: string;
	required: boolean;
	type?: "select" | "textarea" | "text";
}

export interface GeneratorTool {
	audience: Audience;
	description: string;
	display: {
		actionLabel: string;
		category: string;
		examples: readonly string[];
	};
	endpoint: string;
	id: string;
	input: {
		fields?: readonly GeneratorInputField[];
		label: string;
		mode?: "none" | "text";
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
