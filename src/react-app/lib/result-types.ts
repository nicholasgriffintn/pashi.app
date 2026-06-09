import type { ConvertResult, SlackmojiBatchResult } from "./converter-api";
import type { GenerateResult } from "./generate-api";
import type { ImageResult } from "./generator-state";

export type TextResultStageValue = ConvertResult | GenerateResult;

export interface SlackmojiBatchStageValue {
	alt: string;
	generatedAt: string;
	items: SlackmojiBatchResult[];
	kind: "slackmoji-batch";
}

export type ResultStageValue = ImageResult | TextResultStageValue | SlackmojiBatchStageValue;
