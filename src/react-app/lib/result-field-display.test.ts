import assert from "node:assert/strict";
import { test } from "node:test";

import { createFieldDisplayModel } from "./result-field-display.ts";

test("promotes conversion job status and hides empty errors", () => {
	assert.deepEqual(createFieldDisplayModel({
		downloadUrl: "",
		error: "",
		jobId: "job-1",
		status: "queued",
	}), {
		entries: [["jobId", "job-1"]],
		error: undefined,
		status: "queued",
	});
});

test("keeps real conversion job errors visible", () => {
	assert.deepEqual(createFieldDisplayModel({
		error: "ffmpeg failed",
		jobId: "job-1",
		status: "failed",
	}), {
		entries: [["jobId", "job-1"]],
		error: "ffmpeg failed",
		status: "failed",
	});
});
