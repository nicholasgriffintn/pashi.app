import { isStringArray } from "./result-format";
import type { ResultStageValue } from "./result-types";

export interface CoinFlipStageResult {
	generatedAt?: string;
	input: string;
	kind: "text";
	label: string;
	meta: string;
	result: string | string[];
	type: "coinflip";
}

export function isCoinFlipStageResult(result: ResultStageValue | undefined): result is CoinFlipStageResult {
	return Boolean(
		result &&
		result.kind === "text" &&
		result.type === "coinflip" &&
		(typeof result.result === "string" || isStringArray(result.result)),
	);
}

export function coinFlipValues(result: CoinFlipStageResult) {
	return Array.isArray(result.result) ? result.result : [result.result];
}
