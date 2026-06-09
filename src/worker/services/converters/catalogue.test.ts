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

	assert.equal(tools.get("slackmoji")?.status, "available");
	assert.equal(tools.get("slackmoji")?.runtime, "container");
	assert.equal(tools.get("slackmoji")?.endpoint, "/api/slackmoji");
	assert.ok(tools.get("slackmoji")?.api?.accepts.includes("multipart/form-data"));
	assert.ok(tools.get("slackmoji")?.api?.accepts.includes("image/*"));
	assert.ok(tools.get("slackmoji")?.outputs.includes("gif"));
	assert.ok(tools.get("slackmoji")?.api?.examples.some((example) => example.url === "/api/slackmoji?job=<job-id>"));

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
	assert.equal(findConverterTool("video-format-converter")?.id, "video-format");
	assert.equal(findConverterTool("extract-audio-from-video")?.id, "video-format");
	assert.equal(findConverterTool("video-thumbnail-generator")?.id, "video-format");
	assert.equal(findConverterTool("video-audio-remover")?.id, "video-format");
	assert.equal(findConverterTool("change-video-fps")?.id, "video-format");
	assert.equal(findConverterTool("mp3-to-wav")?.id, "audio-format");
	assert.equal(findConverterTool("audio-format-converter")?.id, "audio-format");
	assert.equal(findConverterTool("audio-waveform-generator")?.id, "audio-format");
	assert.equal(findConverterTool("audio-sample-rate-converter")?.id, "audio-format");
	assert.equal(findConverterTool("markdown-to-docx")?.id, "document-format");
	assert.equal(findConverterTool("html-to-docx")?.id, "document-format");
	assert.equal(findConverterTool("png-to-webp")?.id, "image-format");
	assert.equal(findConverterTool("svg-to-png-converter")?.id, "image-format");
	assert.equal(findConverterTool("favicon-generator-from-image")?.id, "image-format");
	assert.equal(findConverterTool("emoji-to-gif")?.id, "slackmoji");
	assert.equal(findConverterTool("slack-emoji")?.id, "slackmoji");
});

test("file conversion advertises raw and multipart API request formats", () => {
	const fileTool = listConverterTools().find((tool) => tool.id === "file-format");

	assert.ok(fileTool?.api?.accepts.includes("text/csv"));
	assert.ok(fileTool?.api?.accepts.includes("multipart/form-data"));
	assert.deepEqual(
		fileTool?.api?.fields.find((field) => field.id === "outputFormat")?.values,
		["txt", "md", "json", "csv", "tsv", "html", "xls", "yaml", "toml", "xml", "ini", "properties", "env", "sql"],
	);
});

test("structured data converter aliases resolve to the file-format engine", () => {
	assert.equal(findConverterTool("json-to-yaml-converter")?.id, "file-format");
	assert.equal(findConverterTool("yaml-to-json-converter")?.id, "file-format");
	assert.equal(findConverterTool("json-to-toml-converter")?.id, "file-format");
	assert.equal(findConverterTool("toml-to-json-converter")?.id, "file-format");
	assert.equal(findConverterTool("xml-to-json-converter")?.id, "file-format");
	assert.equal(findConverterTool("csv-to-sql-converter-inserts")?.id, "file-format");
	assert.equal(findConverterTool("csv-to-excel-converter")?.id, "file-format");
	assert.equal(findConverterTool("excel-json-to-csv-converter")?.id, "file-format");
	assert.equal(findConverterTool("excel-xml-to-csv-converter")?.id, "file-format");
});

test("json transform aliases resolve to the JSON transform engine", () => {
	const jsonTool = listConverterTools().find((tool) => tool.id === "json-transform");

	assert.ok(jsonTool?.outputs.includes("format"));
	assert.ok(jsonTool?.outputs.includes("flatten"));
	assert.ok(jsonTool?.outputs.includes("keys"));
	assert.equal(findConverterTool("json-formatter-beautifier")?.id, "json-transform");
	assert.equal(findConverterTool("json-pretty-print")?.id, "json-transform");
	assert.equal(findConverterTool("json-minifier")?.id, "json-transform");
	assert.equal(findConverterTool("json-sorter")?.id, "json-transform");
	assert.equal(findConverterTool("json-flatten")?.id, "json-transform");
	assert.equal(findConverterTool("json-key-extractor")?.id, "json-transform");
	assert.equal(findConverterTool("json-base64")?.id, "json-transform");
	assert.equal(findConverterTool("json-escape-unescape")?.id, "json-transform");
});

test("url transform aliases resolve to the URL transform engine", () => {
	const urlTool = listConverterTools().find((tool) => tool.id === "url-transform");

	assert.ok(urlTool?.outputs.includes("parse"));
	assert.ok(urlTool?.outputs.includes("query"));
	assert.ok(urlTool?.outputs.includes("extract-links"));
	assert.ok(urlTool?.outputs.includes("extract-emails"));
	assert.equal(findConverterTool("url-parser")?.id, "url-transform");
	assert.equal(findConverterTool("url-query-string-extractor")?.id, "url-transform");
	assert.equal(findConverterTool("url-email-link-extractor")?.id, "url-transform");
	assert.equal(findConverterTool("url-duplicate-finder")?.id, "url-transform");
});

test("html transform aliases resolve to the HTML transform engine", () => {
	const htmlTool = listConverterTools().find((tool) => tool.id === "html-transform");

	assert.ok(htmlTool?.outputs.includes("escape"));
	assert.ok(htmlTool?.outputs.includes("strip-tags"));
	assert.ok(htmlTool?.outputs.includes("to-markdown"));
	assert.equal(findConverterTool("html-entity-encoder-decoder")?.id, "html-transform");
	assert.equal(findConverterTool("html-escape-unescape")?.id, "html-transform");
	assert.equal(findConverterTool("html-tag-remover-stripper")?.id, "html-transform");
	assert.equal(findConverterTool("html-link-extractor-checker")?.id, "html-transform");
	assert.equal(findConverterTool("html-comment-remover-extractor")?.id, "html-transform");
	assert.equal(findConverterTool("html-to-markdown-converter")?.id, "html-transform");
});

test("timestamp transform aliases resolve to the timestamp transform engine", () => {
	const timestampTool = listConverterTools().find((tool) => tool.id === "timestamp-transform");

	assert.ok(timestampTool?.outputs.includes("unix"));
	assert.ok(timestampTool?.outputs.includes("milliseconds"));
	assert.ok(timestampTool?.outputs.includes("discord"));
	assert.equal(findConverterTool("unix-timestamp-converter")?.id, "timestamp-transform");
	assert.equal(findConverterTool("milliseconds-timestamp-converter")?.id, "timestamp-transform");
	assert.equal(findConverterTool("human-date-to-timestamp")?.id, "timestamp-transform");
	assert.equal(findConverterTool("timestamp-to-readable-date")?.id, "timestamp-transform");
	assert.equal(findConverterTool("iso-8601-timestamp-converter")?.id, "timestamp-transform");
	assert.equal(findConverterTool("rfc-timestamp-converter")?.id, "timestamp-transform");
	assert.equal(findConverterTool("discord-timestamp-generator")?.id, "timestamp-transform");
	assert.equal(findConverterTool("add-subtract-time-timestamp")?.id, "timestamp-transform");
	assert.equal(findConverterTool("timestamp-difference-calculator")?.id, "timestamp-transform");
});

test("markdown target aliases resolve to the markdown-format engine", () => {
	const markdownTool = listConverterTools().find((tool) => tool.id === "markdown-format");

	assert.ok(markdownTool?.outputs.includes("slack"));
	assert.ok(markdownTool?.outputs.includes("wordpress-html"));
	assert.equal(findConverterTool("markdown-to-html-converter")?.id, "markdown-format");
	assert.equal(findConverterTool("markdown-to-slack-converter")?.id, "markdown-format");
	assert.equal(findConverterTool("markdown-to-wordpress-html-converter")?.id, "markdown-format");
	assert.equal(findConverterTool("markdown-link-generator")?.id, "markdown-format");
});

test("text and encoding converter aliases resolve to the text-transform engine", () => {
	const textTool = listConverterTools().find((tool) => tool.id === "text-transform");

	assert.ok(textTool?.outputs.includes("binary"));
	assert.ok(textTool?.outputs.includes("from-hex"));
	assert.ok(textTool?.outputs.includes("url-encode"));
	assert.ok(textTool?.outputs.includes("unicode-escape"));
	assert.ok(textTool?.outputs.includes("reverse"));
	assert.ok(textTool?.outputs.includes("word-count"));
	assert.ok(textTool?.outputs.includes("sort-lines"));
	assert.equal(findConverterTool("case-converter")?.id, "text-transform");
	assert.equal(findConverterTool("leet-speak-converter")?.id, "text-transform");
	assert.equal(findConverterTool("character-counter")?.id, "text-transform");
	assert.equal(findConverterTool("duplicate-word-remover")?.id, "text-transform");
	assert.equal(findConverterTool("find-and-replace-text")?.id, "text-transform");
	assert.equal(findConverterTool("remove-duplicate-lines")?.id, "text-transform");
	assert.equal(findConverterTool("sentence-counter")?.id, "text-transform");
	assert.equal(findConverterTool("string-length-calculator")?.id, "text-transform");
	assert.equal(findConverterTool("text-line-sorter")?.id, "text-transform");
	assert.equal(findConverterTool("text-repeater")?.id, "text-transform");
	assert.equal(findConverterTool("text-reverser")?.id, "text-transform");
	assert.equal(findConverterTool("string-reverse")?.id, "text-transform");
	assert.equal(findConverterTool("text-size-calculator")?.id, "text-transform");
	assert.equal(findConverterTool("text-to-hashtags-generator")?.id, "text-transform");
	assert.equal(findConverterTool("text-to-list-converter")?.id, "text-transform");
	assert.equal(findConverterTool("text-to-binary-converter")?.id, "text-transform");
	assert.equal(findConverterTool("binary-to-text-converter")?.id, "text-transform");
	assert.equal(findConverterTool("word-counter")?.id, "text-transform");
	assert.equal(findConverterTool("word-counter-character-counter")?.id, "text-transform");
	assert.equal(findConverterTool("word-frequency-counter")?.id, "text-transform");
	assert.equal(findConverterTool("ascii-to-hex-converter")?.id, "text-transform");
	assert.equal(findConverterTool("hex-to-text-converter")?.id, "text-transform");
	assert.equal(findConverterTool("url-encoder")?.id, "text-transform");
	assert.equal(findConverterTool("url-decoder")?.id, "text-transform");
	assert.equal(findConverterTool("unicode-escape-encoder")?.id, "text-transform");
	assert.equal(findConverterTool("unicode-normalizer")?.id, "text-transform");
	assert.equal(findConverterTool("unicode-whitespace-remover")?.id, "text-transform");
});

test("unit converter aliases resolve to the unit-converter engine", () => {
	const unitTool = listConverterTools().find((tool) => tool.id === "unit-converter");

	assert.ok(unitTool?.outputs.includes("ft"));
	assert.ok(unitTool?.outputs.includes("f"));
	assert.ok(unitTool?.outputs.includes("mb"));
	assert.ok(unitTool?.outputs.includes("w"));
	assert.ok(unitTool?.outputs.includes("hz"));
	assert.ok(unitTool?.outputs.includes("lbf"));
	assert.ok(unitTool?.outputs.includes("lbft"));
	assert.equal(findConverterTool("length-converter")?.id, "unit-converter");
	assert.equal(findConverterTool("temperature-converter")?.id, "unit-converter");
	assert.equal(findConverterTool("data-storage-converter")?.id, "unit-converter");
	assert.equal(findConverterTool("speed-converter")?.id, "unit-converter");
	assert.equal(findConverterTool("weight-converter")?.id, "unit-converter");
	assert.equal(findConverterTool("power")?.id, "unit-converter");
	assert.equal(findConverterTool("force")?.id, "unit-converter");
	assert.equal(findConverterTool("frequency")?.id, "unit-converter");
	assert.equal(findConverterTool("torque")?.id, "unit-converter");
});
