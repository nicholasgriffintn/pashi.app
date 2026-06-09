import { fetchPashiInfo, type FeatureStatusMap, type ServiceStatusMap } from "./pashi-info.ts";

export type ResultDisplayKind = "fields" | "image" | "palette" | "text";
export type GeneratorMode = "ai";

export interface GeneratorInfoTool {
	aliases: string[];
	audience:
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
	description: string;
	display: {
		actionLabel: string;
		category: string;
		examples: string[];
	};
	endpoint: string;
	id: string;
	input: {
		fields?: GeneratorInputField[];
		label: string;
		mode?: "none" | "text";
		required: boolean;
	};
	label: string;
	modes?: GeneratorMode[];
	placeholder: string;
	result: {
		kind: ResultDisplayKind;
	};
	toolType?: string;
}

export interface GeneratorInputField {
	id: string;
	label: string;
	options?: string[];
	placeholder: string;
	required: boolean;
	type?: "select" | "textarea" | "text";
}

export interface GeneratorInfo {
	exportFormats: string[];
	features: FeatureStatusMap;
	name: string;
	services: ServiceStatusMap;
	tools: GeneratorInfoTool[];
}

type ApiInfoTool = GeneratorInfoTool & {
	toolType?: string;
};

function isGeneratorInfoTool(tool: ApiInfoTool): tool is GeneratorInfoTool {
	return tool.toolType !== "converter" && "result" in tool;
}

export async function fetchGeneratorInfo(): Promise<GeneratorInfo> {
	const body = await fetchPashiInfo<ApiInfoTool>();
	if (!("tools" in body)) {
		throw new Error("Could not load generators.");
	}

	return {
		...body,
		exportFormats: "exportFormats" in body && Array.isArray(body.exportFormats) ? body.exportFormats : [],
		tools: body.tools.filter(isGeneratorInfoTool),
	};
}
