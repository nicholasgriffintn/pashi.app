export type ErrorCode =
	| "expired"
	| "internal"
	| "invalid_request"
	| "not_found"
	| "over_budget"
	| "payload_too_large"
	| "rate_limited"
	| "unauthorised"
	| "unavailable";

export function json(data: unknown, status = 200) {
	return Response.json(data, { status });
}

export function errorJson(message: string, status: number, code: ErrorCode, extra?: HeadersInit) {
	return Response.json({ code, error: message }, { headers: extra, status });
}

export class PayloadTooLargeError extends Error {
	readonly limit: number;

	constructor(limit: number, message?: string) {
		super(message ?? `Request body is larger than the ${Math.round(limit / 1024)} KiB limit.`);
		this.name = "PayloadTooLargeError";
		this.limit = limit;
	}
}

export class UploadTooLargeError extends PayloadTooLargeError {
	constructor(limit: number) {
		super(limit, `Upload is larger than the ${Math.round(limit / (1024 * 1024))} MB limit.`);
		this.name = "UploadTooLargeError";
	}
}
