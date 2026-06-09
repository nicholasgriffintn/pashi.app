import type { FeatureStatusMap, ServiceStatusMap } from "../../shared/features";

export type { FeatureStatusMap, ServiceStatusMap };

export interface PashiInfo<Tool = unknown> {
	endpoints: string[];
	exportFormats: string[];
	features: FeatureStatusMap;
	name: string;
	services: ServiceStatusMap;
	tools: Tool[];
}

export async function fetchPashiInfo<Tool = unknown>(): Promise<PashiInfo<Tool>> {
	const response = await fetch("/api/info");
	const body = (await response.json()) as PashiInfo<Tool> | { error?: string };
	if (!response.ok || !("tools" in body)) {
		throw new Error("Could not load Pashi info.");
	}

	return body;
}
