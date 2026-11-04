import type { PolychatModelTier } from "../services/polychat/client";
import { EXPLANATION_SCHEMA, TOOL_ROUTE_SCHEMA, type OutputSchema } from "./schemas";

export type AiFeature = "explain" | "generate" | "route";

export interface AiPolicy {
	maxTokens: number;
	schema: OutputSchema | undefined;
	temperature: number;
	tier: PolychatModelTier;
	timeoutMs: number;
}

const POLICIES: Record<AiFeature, AiPolicy> = {
	explain: {
		maxTokens: 900,
		schema: EXPLANATION_SCHEMA,
		temperature: 0.1,
		tier: "low",
		timeoutMs: 20_000,
	},
	generate: {
		maxTokens: 1600,
		schema: undefined,
		temperature: 0.7,
		tier: "medium",
		timeoutMs: 25_000,
	},
	route: {
		maxTokens: 400,
		schema: TOOL_ROUTE_SCHEMA,
		temperature: 0.1,
		tier: "low",
		timeoutMs: 15_000,
	},
};

export function policyFor(feature: AiFeature) {
	return POLICIES[feature];
}
