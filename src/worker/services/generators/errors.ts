import type { ErrorCode } from "../../utils/http";

export class GeneratorRequestError extends Error {
	readonly code: ErrorCode;
	readonly status: number;

	constructor(message: string, status = 400, code: ErrorCode = "invalid_request") {
		super(message);
		this.name = "GeneratorRequestError";
		this.code = code;
		this.status = status;
	}
}

export function overBudget(message: string) {
	return new GeneratorRequestError(message, 422, "over_budget");
}

export function invalidRequest(message: string) {
	return new GeneratorRequestError(message, 400, "invalid_request");
}
