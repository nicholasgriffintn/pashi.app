import { isRecord } from "../../shared/records";
import { apiFetch } from "./api-request";
import { QueryError } from "./query-client";

let nextRequestId = 1;

function errorMessage(payload: unknown, status: number) {
	if (isRecord(payload)) {
		if (typeof payload.error === "string") {
			return payload.error;
		}

		if (isRecord(payload.error) && typeof payload.error.message === "string") {
			return payload.error.message;
		}
	}

	return `Request failed (${status})`;
}

export async function mcpRequest(
	method: string,
	params: Record<string, unknown>,
	apiKey: string,
	signal?: AbortSignal,
): Promise<unknown> {
	const id = nextRequestId;

	nextRequestId += 1;

	const response = await apiFetch("/mcp", apiKey, {
		body: JSON.stringify({ id, jsonrpc: "2.0", method, params }),
		headers: { Accept: "application/json", "Content-Type": "application/json" },
		method: "POST",
		signal,
	});
	const payload: unknown = await response.json().catch(() => null);

	if (!response.ok || !isRecord(payload) || payload.error !== undefined) {
		throw new QueryError(errorMessage(payload, response.status), response.status);
	}

	return payload.result;
}
