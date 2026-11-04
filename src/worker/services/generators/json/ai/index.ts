import { runAiObject, type AiClient } from "../../../../ai/run";
import type { GeneratorRequest } from "../../request";
import { usesAiMode } from "../../request";
import type { GeneratorTool, JsonResult } from "../../types";
import { readAiPayload } from "./payload";
import { createPrompt, SYSTEM_PROMPT } from "./prompt";
import { isAiSupportedResultKind, responseFormatFor } from "./schema";

export async function createAiResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
	ai: AiClient | undefined,
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

	const payload = await runAiObject(
		ai,
		"generate",
		[
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: createPrompt(generator, request) },
		],
		readAiPayload,
		responseFormatFor(generator.result.kind),
	);

	return {
		input: request.input,
		kind: generator.result.kind,
		label: generator.label,
		meta: payload.meta,
		result: payload.result,
		type: generator.id,
	};
}
