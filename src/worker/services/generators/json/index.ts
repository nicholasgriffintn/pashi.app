import type { GeneratorTool, JsonResult } from "../types";
import type { GeneratorRequest } from "../request";
import { createDateResult } from "./dates";
import { createDesignResult } from "./design";
import { createEngineeringResult } from "./engineering";
import { createGamingResult } from "./gaming";
import { createIdentifierResult } from "./identifiers";
import { createNumberResult } from "./numbers";
import { createPeopleResult } from "./people";
import { createProductResult } from "./product";
import { createRandomResult } from "./random";
import { createSecurityResult } from "./security";
import { createStringResult } from "./strings";
import { createToolsResult } from "./tools";

export async function createJsonResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): Promise<JsonResult> {
	const engineeringResult = await createEngineeringResult(generator, request);
	if (engineeringResult) {
		return engineeringResult;
	}

	const securityResult = await createSecurityResult(generator, request);
	if (securityResult) {
		return securityResult;
	}

	const result =
		createDateResult(generator, request) ??
		createDesignResult(generator, request) ??
		createGamingResult(generator, request) ??
		createIdentifierResult(generator, request) ??
		createNumberResult(generator, request) ??
		createPeopleResult(generator, request) ??
		createProductResult(generator, request) ??
		createRandomResult(generator, request) ??
		createStringResult(generator, request) ??
		createToolsResult(generator, request);

	if (!result) {
		throw new Error("Unknown generator type.");
	}

	return result;
}
