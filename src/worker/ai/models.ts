export type ModelTier = "fast" | "primary";

export const MODEL_TIERS = {
	fast: "@cf/meta/llama-4-scout-17b-16e-instruct",
	primary: "@cf/openai/gpt-oss-120b",
} as const satisfies Record<ModelTier, keyof AiModels>;

export type PashiModel = (typeof MODEL_TIERS)[ModelTier];

export function modelForTier(tier: ModelTier): PashiModel {
	return MODEL_TIERS[tier];
}

export function isKnownModel(value: string): value is PashiModel {
	return Object.values(MODEL_TIERS).some((model) => model === value);
}
