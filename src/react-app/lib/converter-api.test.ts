import assert from "node:assert/strict";
import { test } from "node:test";

import {
	conversionJobStatusUrl,
	isPendingConversionJob,
	type ConvertResult,
} from "./converter-api.ts";

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

test("detects conversion jobs that need frontend polling", () => {
	assert.equal(isPendingConversionJob(jobResult("queued")), true);
	assert.equal(isPendingConversionJob(jobResult("processing")), true);
	assert.equal(isPendingConversionJob(jobResult("complete")), false);
	assert.equal(isPendingConversionJob(jobResult("failed")), false);
	assert.equal(conversionJobStatusUrl(jobResult("queued")), "/api/video-format?job=job-1");
});
