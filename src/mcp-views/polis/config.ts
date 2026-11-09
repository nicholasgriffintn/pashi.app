import { isRecord } from "../../shared/records";

export type PolisViewData =
	| { limits: { maxTowns: number }; mode: "app"; siteUrl: string }
	| { mode: "shared"; recordingUrl: string; siteUrl: string };

export function isPolisViewData(value: unknown): value is PolisViewData {
	if (!isRecord(value) || typeof value.siteUrl !== "string") {
		return false;
	}

	if (value.mode === "shared") {
		return typeof value.recordingUrl === "string";
	}

	return (
		value.mode === "app" && isRecord(value.limits) && typeof value.limits.maxTowns === "number"
	);
}
