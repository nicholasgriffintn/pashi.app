import assert from "node:assert/strict";
import { test } from "node:test";

import type { ConvertResult } from "./converter-api.ts";
import { createConversionJobPoller } from "./converter-polling.ts";

function jobResult(status: string): ConvertResult {
	return {
		generatedAt: "2026-06-09T19:00:00.000Z",
		input: "clip.mp4",
		kind: "fields",
		label: "video conversion job",
		meta: status,
		result: {
			jobId: "job-1",
			outputFormat: "webm",
			status,
			statusUrl: "/api/video-format?job=job-1",
		},
		type: "video-format",
	};
}

test("polls uploaded conversion jobs until they settle", async () => {
	const scheduled: Array<{ callback: () => void; delayMs: number }> = [];
	const seenStatuses: Array<string | undefined> = [];
	let settledStatus: string | undefined;

	const poller = createConversionJobPoller({
		fetchJob: async () => jobResult(seenStatuses.length === 1 ? "processing" : "complete"),
		onError: (error) => {
			throw error;
		},
		onResult: (result) => seenStatuses.push(typeof result.result === "string" ? undefined : result.result.status),
		onSettled: (status) => {
			settledStatus = status;
		},
		scheduler: {
			clearTimeout: () => {},
			setTimeout: (callback, delayMs) => {
				scheduled.push({ callback, delayMs });
				return 0;
			},
		},
	});

	poller.start(jobResult("queued"));
	assert.deepEqual(seenStatuses, ["queued"]);
	assert.deepEqual(scheduled.map(({ delayMs }) => delayMs), [0]);

	scheduled.shift()?.callback();
	await Promise.resolve();
	assert.deepEqual(seenStatuses, ["queued", "processing"]);
	assert.deepEqual(scheduled.map(({ delayMs }) => delayMs), [1800]);

	scheduled.shift()?.callback();
	await Promise.resolve();
	assert.deepEqual(seenStatuses, ["queued", "processing", "complete"]);
	assert.equal(settledStatus, "complete");
});
