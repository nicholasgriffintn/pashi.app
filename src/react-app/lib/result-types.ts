import type { ConvertResult } from "./converter-api";
import type { GenerateResult } from "./generate-api";
import type { ImageResult } from "./generator-state";

export type TextResultStageValue = ConvertResult | GenerateResult;
export type ResultStageValue = ImageResult | TextResultStageValue;
