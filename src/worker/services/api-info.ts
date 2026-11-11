import { isConverterAvailable } from "./converters/availability.ts";
import { listConverterTools } from "./converters/catalogue.ts";
import { listExportFormats } from "./export-formats.ts";
import type { FeatureEnv } from "./features.ts";
import { createFeatureStatus, createServiceStatus } from "./features.ts";
import { listGeneratorTools } from "./generators/catalogue/index.ts";

export function createApiIndexResponse(env: FeatureEnv) {
	const features = createFeatureStatus(env);
	const services = createServiceStatus(env);
	const generators = listGeneratorTools().map((tool) => ({
		...tool,
		apiKeyRequiredModes: features.ai.available && tool.modes?.includes("ai") ? ["ai" as const] : [],
		modes: features.ai.available ? tool.modes : tool.modes?.filter((mode) => mode !== "ai"),
		toolType: "generator" as const,
	}));
	const converters = listConverterTools()
		.filter((tool) => isConverterAvailable(tool, env))
		.map((tool) => ({
			...tool,
			apiKeyRequired: tool.runtime === "container" || Boolean(tool.capabilities?.requiresAccount),
			toolType: "converter" as const,
		}));
	const tools = [...generators, ...converters];

	return {
		authentication: {
			headers: ["Authorization: Bearer <api-key>", "X-API-Key: <api-key>"],
			requiredFor: [
				"container and account-only converters, unless a Polychat Pro account is connected",
			],
			selfServe:
				"Connect Polychat on the sign-in page to create free keys. Free keys cover the free tools with their own rate limit; paid tools need a full key or Polychat Pro.",
		},
		endpoints: tools.flatMap((tool) => (tool.endpoint ? [tool.endpoint] : [])),
		exportFormats: listExportFormats(),
		features,
		name: "Pashi",
		services,
		tools,
	};
}
