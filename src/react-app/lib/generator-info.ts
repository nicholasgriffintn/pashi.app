export type ResultDisplayKind = "fields" | "image" | "palette" | "text";

export interface GeneratorInfoTool {
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
	placeholder: string;
	result: {
		kind: ResultDisplayKind;
	};
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
	name: string;
	tools: GeneratorInfoTool[];
}

export async function fetchGeneratorInfo(): Promise<GeneratorInfo> {
	const response = await fetch("/api/info");
	const body = (await response.json()) as GeneratorInfo | { error?: string };
	if (!response.ok || !("tools" in body)) {
		throw new Error("Could not load generators.");
	}

	return {
		...body,
		exportFormats: "exportFormats" in body && Array.isArray(body.exportFormats) ? body.exportFormats : [],
	};
}

export function getFallbackTool(): GeneratorInfoTool {
	return {
		audience: "Engineering",
		description: "Scannable image for links, notes, and handoff docs.",
		display: {
			actionLabel: "Generate QR",
			category: "Code",
			examples: ["https://pashi.app"],
		},
		endpoint: "/api/qr",
		id: "qr",
		input: { label: "Input", required: true },
		label: "QR image",
		placeholder: "https://pashi.app",
		result: { kind: "image" },
	};
}
