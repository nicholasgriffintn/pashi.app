import { isRecord } from "../../shared/records";

export interface VerbatimConfig {
	limits: { contextLength: number; segmentMaxBytes: number };
}

export function isVerbatimConfig(value: unknown): value is VerbatimConfig {
	return (
		isRecord(value) &&
		isRecord(value.limits) &&
		typeof value.limits.contextLength === "number" &&
		typeof value.limits.segmentMaxBytes === "number"
	);
}
