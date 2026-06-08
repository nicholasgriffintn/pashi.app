export type GenerateResultKind = "fields" | "palette" | "text";

export interface GenerateResult {
	input: string;
	kind: GenerateResultKind;
	label: string;
	meta: string;
	result: string | string[] | Record<string, string>;
	type: string;
}

export async function generateThing(
	endpoint: string,
	input: string,
): Promise<GenerateResult> {
	const response = await fetch(endpoint, {
		body: JSON.stringify({ input }),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});

	const body = (await response.json()) as GenerateResult | { error?: string };
	if (!response.ok) {
		throw new Error("error" in body && body.error ? body.error : "Generation failed.");
	}

	return body as GenerateResult;
}
