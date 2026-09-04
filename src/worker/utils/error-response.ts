import { errorJson, PayloadTooLargeError } from "./http";
import type { ErrorCode } from "./http";

const INTERNAL_ERROR_NAMES = new Set([
	"RangeError",
	"ReferenceError",
	"SyntaxError",
	"TypeError",
	"InternalError",
]);

export interface StatusError {
	code: ErrorCode;
	message: string;
	status: number;
}

export function isStatusError(value: unknown): value is StatusError & Error {
	return (
		value instanceof Error &&
		"status" in value &&
		typeof value.status === "number" &&
		"code" in value &&
		typeof value.code === "string"
	);
}

export function toErrorResponse(error: unknown, fallbackMessage: string) {
	if (error instanceof PayloadTooLargeError) {
		return errorJson(error.message, 413, "payload_too_large");
	}

	if (isStatusError(error)) {
		return errorJson(error.message, error.status, error.code);
	}

	if (error instanceof Error && !INTERNAL_ERROR_NAMES.has(error.name)) {
		return errorJson(error.message, 400, "invalid_request");
	}

	console.error("pashi.internal_error", error);

	return errorJson(fallbackMessage, 500, "internal");
}
