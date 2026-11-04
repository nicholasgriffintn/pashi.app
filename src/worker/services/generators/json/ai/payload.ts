import {
	isRecord,
	isStringArray,
	isStringRecord,
	isStringRecordArray,
} from "../../../../../shared/records";
import type { JsonResult } from "../../types";

type AiPayload = Pick<JsonResult, "meta" | "result">;

export function readAiPayload(value: unknown): AiPayload | undefined {
	return isAiPayload(value) ? value : undefined;
}

function isAiPayload(value: unknown): value is AiPayload {
	if (!isRecord(value) || typeof value.meta !== "string" || !("result" in value)) {
		return false;
	}

	return (
		typeof value.result === "string" ||
		isStringArray(value.result) ||
		isStringRecord(value.result) ||
		isStringRecordArray(value.result)
	);
}
