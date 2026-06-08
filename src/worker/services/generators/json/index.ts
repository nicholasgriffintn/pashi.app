import type { GeneratorTool, JsonResult } from "../types";
import type { GeneratorRequest } from "../request";
import { createDesignResult } from "./design";
import { createEngineeringResult } from "./engineering";
import { createIdentifierResult } from "./identifiers";
import { createProductResult } from "./product";
import { createRandomResult } from "./random";

export async function createJsonResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): Promise<JsonResult> {
	const result =
		(await createEngineeringResult(generator, request)) ??
		createDesignResult(generator, request) ??
		createIdentifierResult(generator, request) ??
		createProductResult(generator, request) ??
		createRandomResult(generator, request);

	if (!result) {
		throw new Error("Unknown generator type.");
	}

	return result;
}
