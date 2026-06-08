import { findGenerator } from "./catalogue";
import type { GeneratorRequest } from "./request";
import { json } from "../../utils/http";
import { createImageResponse } from "./image";
import { createJsonResult } from "./json";

export async function createGeneratorResponse(
	type: string,
	request: GeneratorRequest,
	params = new URLSearchParams(),
) {
	const generator = findGenerator(type);
	if (!generator) {
		return json({ error: "Unknown generator type." }, 404);
	}

	if (generator.result.kind === "image") {
		return createImageResponse(generator, request, params);
	}

	try {
		return json(await createJsonResult(generator, request));
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : "Generation failed." },
			400,
		);
	}
}
