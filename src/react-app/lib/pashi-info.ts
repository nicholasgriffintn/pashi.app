import type { FeatureStatusMap, ServiceStatusMap } from "../../shared/features";
import { jsonQueryOptions, queryClient } from "./query-client";

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
	const body = await queryClient.fetchQuery(jsonQueryOptions<PashiInfo<Tool>>("/api/info"));

	if (!("tools" in body)) {
		throw new Error("Could not load Pashi info.");
	}

	return body;
}
