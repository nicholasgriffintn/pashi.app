import type { ModelTier } from "./models";
import { EXPLANATION_SCHEMA, TOOL_ROUTE_SCHEMA, type OutputSchema } from "./schemas";

export type AiFeature = "explain" | "generate" | "route";

export interface AiPolicy {
	cacheSeconds: number;
	maxTokens: number;
	schema: OutputSchema | undefined;
	temperature: number;
	tier: ModelTier;
	timeoutMs: number;
}

const POLICIES: Record<AiFeature, AiPolicy> = {
	explain: {
		cacheSeconds: 86_400,
		maxTokens: 900,
		schema: EXPLANATION_SCHEMA,
		temperature: 0.1,
		tier: "fast",
		timeoutMs: 20_000,
	},
	generate: {
		cacheSeconds: 0,
		maxTokens: 1600,
		schema: undefined,
		temperature: 0.7,
		tier: "primary",
		timeoutMs: 25_000,
	},
	route: {
		cacheSeconds: 3600,
		maxTokens: 400,
		schema: TOOL_ROUTE_SCHEMA,
		temperature: 0.1,
		tier: "fast",
		timeoutMs: 15_000,
	},
};

export function policyFor(feature: AiFeature) {
	return POLICIES[feature];
}
