import type { AiClient } from "../../ai/run";
import { toErrorResponse } from "../../utils/error-response";
import { errorJson, json } from "../../utils/http";
import { createFeatureStatus, type FeatureEnv } from "../features";
import { findGenerator } from "./catalogue";
import { createImageResponse } from "./image";
import { createJsonResult } from "./json";
import type { GeneratorRequest } from "./request";
import { usesAiMode } from "./request";

export async function createGeneratorResponse(
	type: string,
	request: GeneratorRequest,
	params = new URLSearchParams(),
	env?: FeatureEnv,
	ai?: AiClient,
) {
	const generator = findGenerator(type);

	if (!generator) {
		return errorJson("Unknown generator type.", 404, "not_found");
	}

	const generatedAt = new Date().toISOString();

	if (usesAiMode(request) && (!env || !createFeatureStatus(env).ai.available)) {
		return errorJson("AI mode is not available.", 503, "unavailable");
	}

	if (usesAiMode(request) && !ai) {
		return errorJson("Connect Polychat to use AI mode.", 401, "unauthorised");
	}

	if (generator.result.kind === "image") {
		const response = createImageResponse(generator, request, params);

		response.headers.set("X-Generated-At", generatedAt);

		return response;
	}

	try {
		const result = await createJsonResult(generator, request, ai);

		return json({
			...result,
			generatedAt,
		});
	} catch (error) {
		return toErrorResponse(error, "Generation failed.");
	}
}
