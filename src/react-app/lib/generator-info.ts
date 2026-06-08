export type ResultDisplayKind = "fields" | "image" | "palette" | "text";

export interface GeneratorInfoTool {
	audience: "Design" | "Engineering" | "Product";
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
		kind: ResultDisplayKind;
	};
}

export interface GeneratorInfo {
	name: string;
	tools: GeneratorInfoTool[];
}

export async function fetchGeneratorInfo(): Promise<GeneratorInfo> {
	const response = await fetch("/api/info");
	const body = (await response.json()) as GeneratorInfo | { error?: string };
	if (!response.ok || !("tools" in body)) {
		throw new Error("Could not load generators.");
	}

	return body;
}

export function getFallbackTool(): GeneratorInfoTool {
	return {
		audience: "Engineering",
		description: "Scannable image for links, notes, and handoff docs.",
		endpoint: "/api/qr",
		id: "qr",
		input: { label: "Input", required: true },
		label: "QR image",
		placeholder: "https://pashi.app",
		result: { kind: "image" },
	};
}
