import { isRecord } from "../../shared/records";

export interface JsonRpcRequest {
	id?: number | string | null;
	method: string;
	params?: Record<string, unknown>;
}

export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
	return isRecord(value) && typeof value.method === "string";
}

export function jsonRpcResult(id: JsonRpcRequest["id"], value: unknown) {
	return { id: id ?? null, jsonrpc: "2.0" as const, result: value };
}

export function jsonRpcFailure(
	id: JsonRpcRequest["id"],
	code: number,
	message: string,
	data?: unknown,
) {
	return {
		error: { code, message, ...(data === undefined ? {} : { data }) },
		id: id ?? null,
		jsonrpc: "2.0" as const,
	};
}
