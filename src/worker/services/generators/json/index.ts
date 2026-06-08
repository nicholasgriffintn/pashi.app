import type { GeneratorTool, JsonResult } from "../types";
import { createDesignResult } from "./design";
import { createEngineeringResult } from "./engineering";
import { createProductResult } from "./product";

export async function createJsonResult(
	generator: GeneratorTool,
	input: string,
): Promise<JsonResult> {
	const result =
		(await createEngineeringResult(generator, input)) ??
		createDesignResult(generator, input) ??
		createProductResult(generator, input);

	if (!result) {
		throw new Error("Unknown generator type.");
	}

	return result;
}
