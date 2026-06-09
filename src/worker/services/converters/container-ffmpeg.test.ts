import assert from "node:assert/strict";
import { test } from "node:test";

import { ffmpegArgs } from "../../../../containers/converter/server.mjs";

const SLACKMOJI_EFFECTS = [
	"none",
	"slide_in",
	"slide_out",
	"scroll",
	"spin_right",
	"spin_left",
	"spinning",
	"flipping",
	"zoom",
	"fly_in",
	"fly_by",
	"bounce",
	"intensifies",
	"dizzy",
	"dance",
	"loop",
	"zigzag",
	"yup",
	"excited",
	"nope",
	"jitter",
	"blink",
	"spiral",
	"shrinking",
	"rock",
	"peeking",
	"hologram",
	"frazzled",
	"melting",
	"party",
	"rave",
	"matrix",
	"bees",
	"deal_with_it",
	"glitch",
	"ripple",
	"pixelate",
	"glitch_out",
	"shattered",
	"portal",
	"origami",
	"paint_drip",
	"neon_pulse",
	"pixel_sort",
	"kaleidoscope",
	"bubble_pop",
	"typewriter",
	"black_hole",
	"mosaic_spin",
	"liquid_metal",
	"time_warp",
	"dna_spiral",
	"paint_splash",
	"rubiks",
	"vinyl_record",
	"blueprint",
];

test("builds ffmpeg args for common media operations", () => {
	assert.deepEqual(
		ffmpegArgs("video", "input.mp4", "output.png", "png", { operation: "thumbnail", time: "2.5" }),
		["-hide_banner", "-loglevel", "error", "-y", "-ss", "2.5", "-i", "input.mp4", "-frames:v", "1", "output.png"],
	);
	assert.deepEqual(
		ffmpegArgs("video", "input.mp4", "output.mp3", "mp3", { operation: "extract-audio" }),
		["-hide_banner", "-loglevel", "error", "-y", "-i", "input.mp4", "-vn", "output.mp3"],
	);
	assert.deepEqual(
		ffmpegArgs("audio", "input.mp3", "output.png", "png", { operation: "waveform" }),
		["-hide_banner", "-loglevel", "error", "-y", "-i", "input.mp3", "-filter_complex", "showwavespic=s=1280x360", "-frames:v", "1", "output.png"],
	);
});

test("builds ffmpeg args for all slackmoji effects", () => {
	for (const effect of SLACKMOJI_EFFECTS) {
		const args = ffmpegArgs("image", "input.png", "output.gif", "gif", {
			operation: "slackmoji",
			effect,
		});
		assert.ok(Array.isArray(args), `Expected array for effect ${effect}`);
		const effectIndex = args.findIndex((entry) => entry === "-filter_complex");
		assert.ok(effectIndex > 0, `Expected filter setup for effect ${effect}`);
	}
});
