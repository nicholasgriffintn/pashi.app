import { listConverterTools } from "./converters/catalogue.ts";
import { isConverterAvailable } from "./converters/availability.ts";
import { listExportFormats } from "./export-formats.ts";
import type { FeatureEnv } from "./features.ts";
import { createFeatureStatus, createServiceStatus } from "./features.ts";
import { listGeneratorTools } from "./generators/catalogue/index.ts";

export function createApiIndexResponse(env: FeatureEnv) {
	const features = createFeatureStatus(env);
	const services = createServiceStatus(env);
	const generators = listGeneratorTools().map((tool) => ({
		...tool,
		modes: features.ai.available ? tool.modes : tool.modes?.filter((mode) => mode !== "ai"),
		toolType: "generator" as const,
	}));
	const converters = listConverterTools()
		.filter((tool) => isConverterAvailable(tool, env))
		.map((tool) => ({
			...tool,
			toolType: "converter" as const,
		}));
	const tools = [...generators, ...converters];

	return {
		endpoints: tools.flatMap((tool) => tool.endpoint ? [tool.endpoint] : []),
		exportFormats: listExportFormats(),
		features,
		name: "Pashi",
		services,
		tools,
	};
}
