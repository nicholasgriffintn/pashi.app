export type Audience =
	| "Design"
	| "Engineering"
	| "Gaming"
	| "Geographic"
	| "Identifiers"
	| "Product"
	| "Random"
	| "TestData"
	| "Tools";
export type ResultKind = "fields" | "image" | "palette" | "text";
export type GeneratorResultValue = string | string[] | Record<string, string>;

export interface GeneratorInputField {
	id: string;
	label: string;
	placeholder: string;
	required: boolean;
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
