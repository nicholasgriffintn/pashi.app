import { findGenerator } from "./catalogue";
import { json } from "../../utils/http";
import { createQrResponse } from "./image/qr";
import { createJsonResult } from "./json";

export async function createGeneratorResponse(
	type: string,
	input: string,
	params = new URLSearchParams(),
) {
	const generator = findGenerator(type);
	if (!generator) {
		return json({ error: "Unknown generator type." }, 404);
	}

	if (generator.result.kind === "image") {
		return createQrResponse(input, params);
	}

	try {
		return json(await createJsonResult(generator, input.trim()));
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : "Generation failed." },
			400,
		);
	}
}
