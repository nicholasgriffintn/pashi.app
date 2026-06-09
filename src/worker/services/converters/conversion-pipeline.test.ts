import assert from "node:assert/strict";
import { test } from "node:test";

import { createConversionOperationFields } from "./conversion-options.ts";
import { isAllowedPresetKey } from "./slackmoji-presets.ts";

test("keeps only safe conversion operation fields for queued jobs", () => {
	assert.deepEqual(
		createConversionOperationFields({
			bitrate: "192k",
			duration: "10",
			operation: "thumbnail",
			time: "2.5",
			effect: "spin_left",
			unused: "ignored",
		}),
		{
			bitrate: "192k",
			duration: "10",
			operation: "thumbnail",
			effect: "spin_left",
			time: "2.5",
		},
	);
	assert.deepEqual(
		createConversionOperationFields({
			effect: "none,spin_left,spin_left",
		}),
		{
			effect: "spin_left",
		},
	);
	assert.deepEqual(
		createConversionOperationFields({
			effect: ":spin_left:,:none:",
		}),
		{
			effect: "spin_left",
		},
	);
});

test("validates slackmoji preset keys to the default folder only", () => {
	assert.equal(isAllowedPresetKey("default_emojis/emoji.png"), true);
	assert.equal(isAllowedPresetKey("default_emojis/collections/fail.png"), true);
	assert.equal(isAllowedPresetKey("slackmoji-presets/emoji.png"), false);
	assert.equal(isAllowedPresetKey("/default_emojis/emoji.png"), false);
	assert.equal(isAllowedPresetKey(""), false);
});
