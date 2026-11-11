const ERROR_CODES = [
	"expired",
	"forbidden",
	"internal",
	"invalid_request",
	"not_found",
	"over_budget",
	"payload_too_large",
	"rate_limited",
	"unauthorised",
	"unavailable",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const ERROR_CODES_BY_STATUS = new Map<number, ErrorCode>([
	[400, "invalid_request"],
	[401, "unauthorised"],
	[403, "forbidden"],
	[404, "not_found"],
	[410, "expired"],
	[413, "payload_too_large"],
	[422, "over_budget"],
	[429, "rate_limited"],
	[500, "internal"],
]);

export function isErrorCode(value: unknown): value is ErrorCode {
	return ERROR_CODES.some((code) => code === value);
}

export function errorCodeForStatus(status: number): ErrorCode {
	return ERROR_CODES_BY_STATUS.get(status) ?? (status >= 500 ? "unavailable" : "invalid_request");
}

export function mediaTypeOf(headers: Headers) {
	return (headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
}

export async function readJsonBody(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}

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
