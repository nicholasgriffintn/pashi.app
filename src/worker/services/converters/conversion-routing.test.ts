import assert from "node:assert/strict";
import { test } from "node:test";

import { isQueuedConversionUploadRequest } from "./conversion-routing.ts";

test("routes queued conversion uploads to the container pipeline", () => {
	assert.equal(isQueuedConversionUploadRequest("image-format", "image/tiff"), true);
	assert.equal(isQueuedConversionUploadRequest("image-format", "application/octet-stream"), true);
	assert.equal(isQueuedConversionUploadRequest("audio-format", "audio/flac"), true);
	assert.equal(isQueuedConversionUploadRequest("audio-format", "multipart/form-data; boundary=x"), true);
	assert.equal(isQueuedConversionUploadRequest("document-format", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), true);
	assert.equal(isQueuedConversionUploadRequest("document-format", "text/markdown"), true);
	assert.equal(isQueuedConversionUploadRequest("video-format", "video/x-matroska"), true);
	assert.equal(isQueuedConversionUploadRequest("video-format", "audio/mpeg"), true);
});

test("does not route JSON converter requests as queued conversion uploads", () => {
	assert.equal(isQueuedConversionUploadRequest("image-format", "application/json"), false);
	assert.equal(isQueuedConversionUploadRequest("audio-format", "application/json"), false);
	assert.equal(isQueuedConversionUploadRequest("document-format", "application/json"), false);
	assert.equal(isQueuedConversionUploadRequest("video-format", "application/json"), false);
});
