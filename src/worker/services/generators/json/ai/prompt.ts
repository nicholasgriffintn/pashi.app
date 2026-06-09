import type { GeneratorRequest } from "../../request";
import { generatorDataFields } from "../../request";
import type { GeneratorTool } from "../../types";

export const AI_MODEL = "@cf/zai-org/glm-4.7-flash";
export const SYSTEM_PROMPT = [
	"You generate concise fake data for Pashi.",
	"Return only data that matches the supplied JSON schema.",
	"Every object value must be a string.",
	"Do not include markdown, commentary, secrets, or real personal data.",
].join(" ");

export function createPrompt(generator: GeneratorTool, request: GeneratorRequest) {
	return JSON.stringify({
		fields: generatorDataFields(request),
		generator: {
			description: generator.description,
			id: generator.id,
			label: generator.label,
			resultKind: generator.result.kind,
		},
		input: request.input,
	});
}
