import type { GeneratorRequest } from "../../request";
import { usesAiMode } from "../../request";
import type { GeneratorTool, JsonResult } from "../../types";
import { readAiPayload } from "./payload";
import { AI_MODEL, createPrompt, SYSTEM_PROMPT } from "./prompt";
import { isAiSupportedResultKind, responseFormatFor } from "./schema";

export async function createAiResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
	ai: Ai | undefined,
): Promise<JsonResult | undefined> {
	if (!usesAiMode(request)) {
		return undefined;
	}

	if (!isAiSupportedResultKind(generator.result.kind)) {
		throw new Error("AI mode is not available for image generators.");
	}

	if (!ai) {
		throw new Error("AI mode is not configured.");
	}

	const output = await ai.run(AI_MODEL, {
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: createPrompt(generator, request) },
		],
		chat_template_kwargs: {
			enable_thinking: false,
		},
		max_completion_tokens: 1600,
		response_format: responseFormatFor(generator.result.kind),
		temperature: 0.7,
	});
	const payload = readAiPayload(output);

	return {
		input: request.input,
		kind: generator.result.kind,
		label: generator.label,
		meta: payload.meta,
		result: payload.result,
		type: generator.id,
	};
}
