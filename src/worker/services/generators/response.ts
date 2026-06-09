import { findGenerator } from "./catalogue";
import type { GeneratorRequest } from "./request";
import { json } from "../../utils/http";
import { createImageResponse } from "./image";
import { createJsonResult } from "./json";
import { usesAiMode } from "./request";
import { createFeatureStatus, type FeatureEnv } from "../features";

export async function createGeneratorResponse(
	type: string,
	request: GeneratorRequest,
	params = new URLSearchParams(),
	env?: FeatureEnv,
) {
	const generator = findGenerator(type);
	if (!generator) {
		return json({ error: "Unknown generator type." }, 404);
	}

	const generatedAt = new Date().toISOString();
	if (usesAiMode(request) && (!env || !createFeatureStatus(env).ai.available)) {
		return json({ error: "AI mode is not available." }, 503);
	}

	if (generator.result.kind === "image") {
		const response = createImageResponse(generator, request, params);
		response.headers.set("X-Generated-At", generatedAt);
		return response;
	}

	try {
		const result = await createJsonResult(generator, request, env?.AI ? { AI: env.AI } : undefined);
		return json({
			...result,
			generatedAt,
		});
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : "Generation failed." },
			400,
		);
	}
}
