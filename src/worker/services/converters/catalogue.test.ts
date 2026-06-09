import assert from "node:assert/strict";
import { test } from "node:test";

import { findConverterTool, listConverterTools } from "./catalogue.ts";

test("available converters are worker-backed generic API tools", () => {
	for (const tool of listConverterTools().filter((item) => item.status === "available")) {
		assert.ok(tool.runtime === "worker" || tool.runtime === "container");
		assert.equal(tool.endpoint, `/api/${tool.id}`);
		assert.doesNotMatch(tool.endpoint, /^\/api\/convert\//);
		assert.deepEqual(tool.api?.methods, ["GET", "POST"]);
		assert.equal(tool.api?.examples.every((example) => example.url.startsWith(`/api/${tool.id}`)), true);
	}
});

test("queued container conversion exposes generic upload and job APIs", () => {
	const tools = new Map(listConverterTools().map((tool) => [tool.id, tool]));

	assert.ok(tools.get("image-format")?.outputs.includes("tiff"));
	assert.equal(tools.get("image-format")?.status, "available");
	assert.equal(tools.get("image-format")?.runtime, "container");
	assert.ok(tools.get("image-format")?.api?.accepts.includes("multipart/form-data"));
	assert.ok(tools.get("image-format")?.api?.accepts.includes("image/*"));
	assert.ok(tools.get("image-format")?.api?.examples.some((example) => example.url === "/api/image-format?job=<job-id>"));

	assert.equal(tools.get("video-format")?.status, "available");
	assert.equal(tools.get("video-format")?.runtime, "container");
	assert.equal(tools.get("video-format")?.endpoint, "/api/video-format");
	assert.ok(tools.get("video-format")?.api?.accepts.includes("video/*"));
	assert.ok(tools.get("video-format")?.api?.accepts.includes("audio/*"));
	assert.ok(tools.get("video-format")?.api?.examples.some((example) => example.url === "/api/video-format?job=<job-id>"));

	assert.equal(tools.get("audio-format")?.status, "available");
	assert.equal(tools.get("audio-format")?.runtime, "container");
	assert.equal(tools.get("audio-format")?.endpoint, "/api/audio-format");
	assert.ok(tools.get("audio-format")?.api?.accepts.includes("audio/*"));
	assert.ok(tools.get("audio-format")?.outputs.includes("flac"));

	assert.equal(tools.get("document-format")?.status, "available");
	assert.equal(tools.get("document-format")?.runtime, "container");
	assert.equal(tools.get("document-format")?.endpoint, "/api/document-format");
	assert.ok(tools.get("document-format")?.api?.accepts.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
	assert.ok(tools.get("document-format")?.outputs.includes("docx"));
});

test("queued converter aliases resolve to canonical API tools", () => {
	assert.equal(findConverterTool("mp4-to-webm")?.id, "video-format");
	assert.equal(findConverterTool("mp3-to-wav")?.id, "audio-format");
	assert.equal(findConverterTool("markdown-to-docx")?.id, "document-format");
	assert.equal(findConverterTool("png-to-webp")?.id, "image-format");
});

test("file conversion advertises raw and multipart API request formats", () => {
	const fileTool = listConverterTools().find((tool) => tool.id === "file-format");

	assert.ok(fileTool?.api?.accepts.includes("text/csv"));
	assert.ok(fileTool?.api?.accepts.includes("multipart/form-data"));
	assert.deepEqual(
		fileTool?.api?.fields.find((field) => field.id === "outputFormat")?.values,
		["txt", "md", "json", "csv", "html"],
	);
});
