import assert from "node:assert/strict";
import { test } from "node:test";

import { createApiIndexResponse } from "./api-info.ts";
import type { FeatureEnv } from "./features.ts";

const availableEnv: FeatureEnv = {
	AI: {} as Ai,
	CONVERSION_BUCKET: {} as R2Bucket,
	CONVERSION_CONTAINER: {} as DurableObjectNamespace,
	CONVERSION_QUEUE: {} as Queue,
	ENABLE_AI: "true",
	ENABLE_CONVERSIONS: "true",
};

test("/api/info exposes service and feature status", () => {
	const info = createApiIndexResponse(availableEnv);

	assert.equal(info.features.ai.available, true);
	assert.equal(info.features.conversions.available, true);
	assert.equal(info.services.ai.status, "available");
	assert.equal(info.services.conversionQueue.status, "available");
});

test("/api/info removes converter tools when conversion services are unavailable", () => {
	const info = createApiIndexResponse({
		AI: {} as Ai,
		ENABLE_AI: "true",
		ENABLE_CONVERSIONS: "true",
	});

	assert.equal(info.features.conversions.enabled, true);
	assert.equal(info.features.conversions.available, false);
	assert.equal(info.tools.some((tool) => tool.toolType === "converter"), false);
	assert.equal(info.endpoints.some((endpoint) => endpoint.startsWith("/api/markdown-to-jira")), false);
});

test("/api/info removes AI modes when the AI feature is unavailable", () => {
	const info = createApiIndexResponse({
		...availableEnv,
		ENABLE_AI: "false",
	});

	assert.equal(info.features.ai.enabled, false);
	assert.equal(info.features.ai.available, false);
	assert.equal(info.tools.some((tool) => tool.toolType === "generator" && tool.modes?.includes("ai")), false);
});
