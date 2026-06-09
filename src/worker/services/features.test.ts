import assert from "node:assert/strict";
import { test } from "node:test";

import { createFeatureStatus, createServiceStatus, type FeatureEnv } from "./features.ts";

const availableEnv: FeatureEnv = {
	AI: {} as Ai,
	CONVERSION_BUCKET: {} as R2Bucket,
	CONVERSION_CONTAINER: {} as DurableObjectNamespace,
	CONVERSION_QUEUE: {} as Queue,
	ENABLE_AI: "true",
	ENABLE_CONVERSIONS: "true",
};

test("marks enabled features available only when required bindings exist", () => {
	assert.deepEqual(createFeatureStatus(availableEnv), {
		ai: {
			available: true,
			enabled: true,
			requiredServices: ["ai"],
			unavailableServices: [],
		},
		conversions: {
			available: true,
			enabled: true,
			requiredServices: ["conversionBucket", "conversionContainer", "conversionQueue"],
			unavailableServices: [],
		},
	});
});

test("reports missing conversion services even when the flag is enabled", () => {
	const features = createFeatureStatus({
		AI: {} as Ai,
		ENABLE_AI: "true",
		ENABLE_CONVERSIONS: "true",
	});

	assert.equal(features.conversions.enabled, true);
	assert.equal(features.conversions.available, false);
	assert.deepEqual(features.conversions.unavailableServices, [
		"conversionBucket",
		"conversionContainer",
		"conversionQueue",
	]);
});

test("reports disabled flags separately from service availability", () => {
	const features = createFeatureStatus({
		...availableEnv,
		ENABLE_AI: "false",
		ENABLE_CONVERSIONS: "false",
	});
	const services = createServiceStatus(availableEnv);

	assert.equal(features.ai.enabled, false);
	assert.equal(features.ai.available, false);
	assert.equal(features.conversions.enabled, false);
	assert.equal(features.conversions.available, false);
	assert.equal(services.ai.available, true);
	assert.equal(services.conversionQueue.available, true);
});
