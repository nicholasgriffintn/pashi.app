import { createFeatureStatus, createServiceStatus, type FeatureEnv } from "../features.ts";
import type { ConverterTool } from "./types.ts";

export function isConverterFeatureEnabled(env: FeatureEnv | undefined) {
	return Boolean(env && createFeatureStatus(env).conversions.enabled);
}

export function hasQueuedConversionServices(env: FeatureEnv | undefined) {
	if (!env) {
		return false;
	}

	const services = createServiceStatus(env);
	return (
		services.conversionBucket.available &&
		services.conversionContainer.available &&
		services.conversionQueue.available
	);
}

export function isConverterAvailable(tool: ConverterTool, env: FeatureEnv | undefined) {
	if (!isConverterFeatureEnabled(env)) {
		return false;
	}

	return tool.runtime === "worker" || hasQueuedConversionServices(env);
}
