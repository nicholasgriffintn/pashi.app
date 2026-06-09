import assert from "node:assert/strict";
import { test } from "node:test";

import { applyConverterPresetFields } from "./presets.ts";

test("applies media operation defaults from converter aliases without overriding explicit fields", () => {
	assert.deepEqual(
		applyConverterPresetFields("video-thumbnail-generator", {}),
		{ operation: "thumbnail", outputFormat: "png" },
	);
	assert.deepEqual(
		applyConverterPresetFields("extract-audio-from-video", {}),
		{ operation: "extract-audio", outputFormat: "mp3" },
	);
	assert.deepEqual(
		applyConverterPresetFields("video-thumbnail-generator", { outputFormat: "webp", time: "3" }),
		{ operation: "thumbnail", outputFormat: "webp", time: "3" },
	);
	assert.deepEqual(
		applyConverterPresetFields("audio-waveform-generator", {}),
		{ operation: "waveform", outputFormat: "png" },
	);
	assert.deepEqual(
		applyConverterPresetFields("slackmoji", {}),
		{ operation: "slackmoji", outputFormat: "gif" },
	);
});

test("applies document target defaults from converter aliases without overriding explicit fields", () => {
	assert.deepEqual(
		applyConverterPresetFields("markdown-to-html-converter", {}),
		{ outputFormat: "wordpress-html" },
	);
	assert.deepEqual(
		applyConverterPresetFields("markdown-to-html-converter", { outputFormat: "slack" }),
		{ outputFormat: "slack" },
	);
});
