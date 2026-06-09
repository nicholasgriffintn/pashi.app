import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { mkdir, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { pipeline } from "node:stream/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const OUTPUT_FORMAT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const AUDIO_OUTPUT_FORMATS = new Set(["aac", "aiff", "alac", "flac", "m4a", "mka", "mp3", "oga", "ogg", "opus", "wav", "wma"]);
const DOCUMENT_OUTPUT_FORMATS = new Set(["docx", "epub", "html", "md", "odt", "rtf", "txt"]);
const MAX_BYTES = 250 * 1024 * 1024;
const SLACKMOJI_DURATION_SECONDS = 1.6;
const SLACKMOJI_FPS = 12;
const SLACKMOJI_DEFAULT_EFFECT = "spin_right";
const HDR_REC2020_PROFILE_PATH = "/app/2020_profile.icc";
const SLACKMOJI_EFFECT_ALIASES = Object.freeze({
	"none": "none",
	"spinning": "spin_right",
	"flipping": "spin_left",
	"slide_in": "slide_in",
	"slide_out": "slide_out",
	"scroll": "scroll",
	"spin_right": "spin_right",
	"spin_left": "spin_left",
	"zoom": "zoom",
	"fly_in": "fly_in",
	"fly_by": "fly_by",
	"bounce": "bounce",
	"intensifies": "intensifies",
	"dizzy": "jitter",
	"dance": "dance",
	"loop": "spin_right",
	"zigzag": "jitter",
	"yup": "blink",
	"excited": "party",
	"nope": "rock",
	"jitter": "jitter",
	"blink": "blink",
	"spiral": "spin_left",
	"shrinking": "zoom",
	"rock": "rock",
	"peeking": "spin_left",
	"hologram": "party",
	"frazzled": "jitter",
	"melting": "zoom",
	"party": "party",
	"rave": "party",
	"matrix": "spin_left",
	"bees": "jitter",
	"deal_with_it": "spin_right",
	"glitch": "party",
	"ripple": "scroll",
	"pixelate": "zoom",
	"glitch_out": "blink",
	"shattered": "jitter",
	"portal": "fly_by",
	"origami": "bounce",
	"paint_drip": "pulse",
	"neon_pulse": "pulse",
	"pixel_sort": "spin_right",
	"kaleidoscope": "spin_left",
	"bubble_pop": "pulse",
	"typewriter": "blink",
	"black_hole": "spin_right",
	"mosaic_spin": "spin_left",
	"liquid_metal": "rock",
	"time_warp": "zoom",
	"dna_spiral": "spin_right",
	"paint_splash": "jitter",
	"rubiks": "spin_left",
	"vinyl_record": "spin_right",
	"blueprint": "spin_right",
});
const SLACKMOJI_EFFECTS = new Set(Object.keys(SLACKMOJI_EFFECT_ALIASES));

function extensionForFormat(format) {
	return format === "jpeg" ? "jpg" : format;
}

function contentTypeFor(kind, format) {
	switch (format) {
		case "aac":
			return "audio/aac";
		case "aiff":
			return "audio/aiff";
		case "avif":
			return "image/avif";
		case "bmp":
			return "image/bmp";
		case "flac":
			return "audio/flac";
		case "docx":
			return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
		case "epub":
			return "application/epub+zip";
		case "gif":
			return "image/gif";
		case "html":
			return "text/html;charset=utf-8";
		case "ico":
			return "image/vnd.microsoft.icon";
		case "jpeg":
		case "mjpeg":
			return "image/jpeg";
		case "m4a":
			return "audio/mp4";
		case "mka":
		case "mkv":
			return "video/x-matroska";
		case "mov":
			return "video/quicktime";
		case "mp3":
			return "audio/mpeg";
		case "mp4":
		case "m4v":
			return "video/mp4";
		case "oga":
		case "ogg":
		case "opus":
			return "audio/ogg";
		case "odt":
			return "application/vnd.oasis.opendocument.text";
		case "png":
			return "image/png";
		case "rtf":
			return "application/rtf";
		case "tiff":
			return "image/tiff";
		case "txt":
			return "text/plain;charset=utf-8";
		case "wav":
			return "audio/wav";
		case "webm":
			return kind === "audio" ? "audio/webm" : "video/webm";
		case "webp":
			return "image/webp";
		case "wmv":
			return "video/x-ms-wmv";
	}

	if (kind === "image") {
		return `image/${format}`;
	}
	if (kind === "audio" || AUDIO_OUTPUT_FORMATS.has(format)) {
		return `audio/${format}`;
	}
	if (kind === "document" || DOCUMENT_OUTPUT_FORMATS.has(format)) {
		return "application/octet-stream";
	}

	return `video/${format}`;
}

function normaliseFormat(kind, value) {
	const format = value.trim().toLowerCase();
	if (!["audio", "document", "image", "video"].includes(kind) || !OUTPUT_FORMAT_PATTERN.test(format)) {
		return undefined;
	}

	return format === "jpg" ? "jpeg" : format;
}

function extensionFromSourceName(sourceName) {
	const extension = sourceName.toLowerCase().match(/\.([a-z0-9][a-z0-9_-]{0,31})$/)?.[1];
	return extension && OUTPUT_FORMAT_PATTERN.test(extension) ? extension : undefined;
}

export function ffmpegArgs(kind, inputPath, outputPath, outputFormat, options = {}) {
	if (kind === "image" && outputFormat === "gif" && options.operation === "slackmoji") {
		return slackmojiFfmpegArgs(inputPath, outputPath, options);
	}

	const inputTime = timestampOption(options.time);
	const base = ["-hide_banner", "-loglevel", "error", "-y", ...inputTime, "-i", inputPath];
	const outputOptions = ffmpegOutputOptions(kind, outputFormat, options);
	if (options.operation === "thumbnail") {
		return [...base, "-frames:v", "1", outputPath];
	}
	if (options.operation === "waveform") {
		return [...base, "-filter_complex", "showwavespic=s=1280x360", "-frames:v", "1", outputPath];
	}
	if (options.operation === "extract-audio") {
		return [...base, ...outputOptions, "-vn", outputPath];
	}
	if (options.operation === "remove-audio") {
		return [...base, ...outputOptions, "-an", outputPath];
	}

	if (kind === "image") {
		return [...base, "-frames:v", "1", outputPath];
	}
	if (kind === "audio") {
		return [...base, ...outputOptions, "-vn", outputPath];
	}

	switch (outputFormat) {
		case "aac":
		case "aiff":
		case "flac":
		case "m4a":
		case "mp3":
		case "oga":
		case "ogg":
		case "opus":
		case "wav":
			return [...base, ...outputOptions, "-vn", outputPath];
		case "mp4":
		case "mov":
			return [...base, ...outputOptions, "-movflags", "+faststart", outputPath];
		case "webm":
			return [...base, ...outputOptions, "-c:v", "libvpx-vp9", "-c:a", "libopus", outputPath];
		default:
			return [...base, ...outputOptions, outputPath];
	}
}

function hdrEmojiSourceFfmpegArgs(inputPath, outputPath) {
	const filter = [
		"format=rgba",
		"scale=128:128:force_original_aspect_ratio=decrease",
		"pad=128:128:(ow-iw)/2:(oh-ih)/2:color=0x00000000",
		"format=rgba",
	].join(",");

	return [
		"-hide_banner",
		"-loglevel",
		"error",
		"-y",
		"-i",
		inputPath,
		"-vf",
		filter,
		"-frames:v",
		"1",
		"-compression_level",
		"9",
		outputPath,
	];
}

function hdrEmojiMagickArgs(inputPath, outputPath, options) {
	const intensity = numberOption(options.intensity, 1, 2.5, 1.5);
	const gamma = numberOption(options.gamma, 0.6, 1.4, 0.9);

	return [
		inputPath,
		"-define",
		"quantum:format=floating-point",
		"-colorspace",
		"RGB",
		"-auto-gamma",
		"-evaluate",
		"Multiply",
		intensity.toFixed(2),
		"-evaluate",
		"Pow",
		gamma.toFixed(2),
		"-colorspace",
		"sRGB",
		"-depth",
		"16",
		"-profile",
		HDR_REC2020_PROFILE_PATH,
		outputPath,
	];
}

function slackmojiFfmpegArgs(inputPath, outputPath, options) {
	const effect = slackmojiEffect(options.effect);
	const [effectFilter, overlay] = slackmojiEffectFilter(effect);
	const baseFilter = [
		`color=c=0x00000000:s=128x128:r=${SLACKMOJI_FPS}:d=${SLACKMOJI_DURATION_SECONDS}[bg]`,
		"[0:v]format=rgba,scale=96:96:force_original_aspect_ratio=decrease,setsar=1[src]",
		effectFilter,
		`[bg][fx]overlay=${overlay}:format=auto:shortest=1,split[gif][palette_src]`,
		"[palette_src]palettegen=reserve_transparent=1:stats_mode=diff[palette]",
		"[gif][palette]paletteuse=alpha_threshold=128:dither=bayer:bayer_scale=3",
	].join(";");

	return [
		"-hide_banner",
		"-loglevel",
		"error",
		"-y",
		"-loop",
		"1",
		"-t",
		String(SLACKMOJI_DURATION_SECONDS),
		"-i",
		inputPath,
		"-filter_complex",
		baseFilter,
		"-gifflags",
		"+transdiff",
		"-loop",
		"0",
		outputPath,
	];
}

function slackmojiEffect(value) {
	const effect = typeof value === "string" ? value.trim().toLowerCase().replace(/^:+/, "").replace(/:+$/, "") : "";
	const resolved = SLACKMOJI_EFFECT_ALIASES[effect];
	if (!resolved || resolved === "none") {
		return SLACKMOJI_DEFAULT_EFFECT;
	}

	return resolved;
}

function slackmojiEffectFilter(effect) {
	switch (effect) {
		case "slide_in":
			return ["[src]null[fx]", "x='if(lt(t,0.55),-w+((W-w)/2+w)*t/0.55,(W-w)/2)':y='(H-h)/2'"];
		case "slide_out":
			return ["[src]null[fx]", "x='if(lt(t,0.9),(W-w)/2,(W-w)/2+(W+w)*(t-0.9)/0.7)':y='(H-h)/2'"];
		case "scroll":
			return ["[src]null[fx]", "x='mod(W-t*140,W+w)-w':y='(H-h)/2'"];
		case "spin_right":
			return ["[src]rotate='2*PI*t/1.6':ow=128:oh=128:c=none[fx]", "x=0:y=0"];
		case "spin_left":
			return ["[src]rotate='-2*PI*t/1.6':ow=128:oh=128:c=none[fx]", "x=0:y=0"];
		case "bounce":
			return ["[src]null[fx]", "x='(W-w)/2':y='(H-h)/2-abs(sin(2*PI*t/0.8))*24'"];
		case "jitter":
			return ["[src]null[fx]", "x='(W-w)/2+sin(80*t)*5':y='(H-h)/2+cos(73*t)*5'"];
		case "rock":
			return ["[src]rotate='0.28*sin(2*PI*t/0.55)':ow=128:oh=128:c=none[fx]", "x=0:y=0"];
		case "pulse":
			return ["[src]scale=w='96+14*sin(2*PI*t/0.8)':h='96+14*sin(2*PI*t/0.8)':eval=frame[fx]", "x='(W-w)/2':y='(H-h)/2'"];
		case "zoom":
			return ["[src]scale=w='48+48*min(t/0.65,1)':h='48+48*min(t/0.65,1)':eval=frame[fx]", "x='(W-w)/2':y='(H-h)/2'"];
		case "fly_by":
			return ["[src]rotate='0.18*sin(2*PI*t/0.35)':ow=128:oh=128:c=none[fx]", "x='-W+(W*2)*t/1.6':y='(H-h)/2+sin(2*PI*t/0.45)*16'"];
		case "fly_in":
			return ["[src]rotate='0.2*min(t/0.55,1)':ow=128:oh=128:c=none[fx]", "x='if(lt(t,0.55),-w+((W-w)/2+w)*t/0.55,(W-w)/2)':y='(H-h)/2'"];
		case "intensifies":
			return ["[src]scale=w='96+8*sin(54*t)':h='96+8*cos(47*t)':eval=frame[fx]", "x='(W-w)/2+sin(91*t)*7':y='(H-h)/2+cos(83*t)*7'"];
		case "dance":
			return ["[src]rotate='0.22*sin(2*PI*t/0.45)':ow=128:oh=128:c=none[fx]", "x='sin(2*PI*t/0.8)*12':y='sin(2*PI*t/0.4)*7'"];
		case "blink":
			return ["[src]format=rgba,colorchannelmixer=aa='if(lt(mod(t,0.5),0.22),1,0.18)'[fx]", "x='(W-w)/2':y='(H-h)/2'"];
		case "party":
			return ["[src]hue='H=2*PI*t:s=1.4',rotate='0.18*sin(2*PI*t/0.38)':ow=128:oh=128:c=none[fx]", "x=0:y=0"];
		default:
			return ["[src]null[fx]", "x='(W-w)/2':y='(H-h)/2'"];
	}
}

function ffmpegOutputOptions(kind, outputFormat, options) {
	const args = [];
	const duration = durationOption(options.duration);
	if (duration.length > 0) {
		args.push(...duration);
	}
	if (kind !== "audio" && options.operation === "grayscale") {
		args.push("-vf", "format=gray");
	} else if (kind !== "audio" && (options.width || options.height)) {
		args.push("-vf", scaleFilter(options.width, options.height));
	} else if (kind !== "audio" && options.fps) {
		args.push("-r", integerOption(options.fps, 1, 240, "30"));
	}
	if (options.bitrate) {
		args.push(kind === "audio" || AUDIO_OUTPUT_FORMATS.has(outputFormat) ? "-b:a" : "-b:v", bitrateOption(options.bitrate));
	}
	if (options.channels) {
		args.push("-ac", integerOption(options.channels, 1, 8, "2"));
	}
	if (options.sampleRate) {
		args.push("-ar", integerOption(options.sampleRate, 8000, 192000, "44100"));
	}
	if (options.speed && kind !== "image") {
		args.push(kind === "audio" ? "-filter:a" : "-filter:v", kind === "audio" ? atempoFilter(options.speed) : `setpts=${(1 / numberOption(options.speed, 0.25, 4, 1)).toFixed(4)}*PTS`);
	}
	if (options.volume && kind !== "image") {
		args.push("-filter:a", `volume=${numberOption(options.volume, 0, 4, 1).toFixed(2)}`);
	}
	return args;
}

function timestampOption(value) {
	return value ? ["-ss", numberOption(value, 0, 86400, 0).toString()] : [];
}

function durationOption(value) {
	return value ? ["-t", numberOption(value, 0.1, 86400, 10).toString()] : [];
}

function scaleFilter(width, height) {
	const safeWidth = width ? integerOption(width, 16, 7680, "1280") : "-2";
	const safeHeight = height ? integerOption(height, 16, 4320, "720") : "-2";
	return `scale=${safeWidth}:${safeHeight}`;
}

function bitrateOption(value) {
	return /^[1-9]\d{1,5}k$/.test(value) ? value : "192k";
}

function integerOption(value, min, max, fallback) {
	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) && parsed >= min && parsed <= max ? String(parsed) : fallback;
}

function numberOption(value, min, max, fallback) {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function atempoFilter(value) {
	const speed = numberOption(value, 0.5, 2, 1);
	return `atempo=${speed.toFixed(2)}`;
}

function pandocArgs(inputPath, outputPath) {
	return [inputPath, "-o", outputPath];
}

async function runCommand(command, args) {
	await new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
		let errorOutput = "";
		child.stderr.on("data", (chunk) => {
			errorOutput += chunk.toString();
			if (errorOutput.length > 4000) {
				errorOutput = errorOutput.slice(-4000);
			}
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(errorOutput.trim() || `${command} exited with code ${code}`));
			}
		});
	});
}

async function runFfmpeg(args) {
	await runCommand("ffmpeg", args);
}

async function runMagick(args) {
	await runCommand("convert", args);
}

async function runPandoc(args) {
	await runCommand("pandoc", args);
}

async function runHdrEmoji(inputPath, outputPath, options, workDir) {
	const normalizedInputPath = join(workDir, "hdr-source.png");
	await runFfmpeg(hdrEmojiSourceFfmpegArgs(inputPath, normalizedInputPath));
	await runMagick(hdrEmojiMagickArgs(normalizedInputPath, outputPath, options));
}

async function handleConvert(request, response) {
	const url = new URL(request.url, "http://localhost");
	const kind = url.searchParams.get("kind");
	const sourceExtension = extensionFromSourceName(url.searchParams.get("sourceName") ?? "");
	const outputFormat = normaliseFormat(kind ?? "", url.searchParams.get("outputFormat") ?? "");
	const operationFields = Object.fromEntries(url.searchParams.entries());
	const contentLength = Number(request.headers["content-length"] ?? 0);

	if ((kind !== "audio" && kind !== "document" && kind !== "image" && kind !== "video") || !outputFormat) {
		response.writeHead(400, { "Content-Type": "application/json" });
		response.end(JSON.stringify({ error: "Unsupported conversion format." }));
		return;
	}

	if (contentLength > MAX_BYTES) {
		response.writeHead(413, { "Content-Type": "application/json" });
		response.end(JSON.stringify({ error: "Uploaded file is too large." }));
		return;
	}

	const workDir = join(tmpdir(), `pashi-${randomUUID()}`);
	const inputPath = join(workDir, sourceExtension ? `source.${sourceExtension}` : "source");
	const outputPath = join(workDir, `output.${extensionForFormat(outputFormat)}`);

	try {
		await mkdir(workDir, { recursive: true });
		await pipeline(request, createWriteStream(inputPath));
		if (kind === "document") {
			await runPandoc(pandocArgs(inputPath, outputPath));
		} else if (kind === "image" && outputFormat === "png" && operationFields.operation === "hdr-emoji") {
			await runHdrEmoji(inputPath, outputPath, operationFields, workDir);
		} else {
			await runFfmpeg(ffmpegArgs(kind, inputPath, outputPath, outputFormat, operationFields));
		}
		const outputStats = await stat(outputPath);
		response.writeHead(200, {
			"Cache-Control": "no-store",
			"Content-Length": String(outputStats.size),
			"Content-Type": contentTypeFor(kind, outputFormat),
		});
		await pipeline(createReadStream(outputPath), response);
	} catch (error) {
		response.writeHead(422, { "Content-Type": "application/json" });
		response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Conversion failed." }));
	} finally {
		await rm(workDir, { force: true, recursive: true });
	}
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
	createServer((request, response) => {
		if (request.method === "POST" && request.url?.startsWith("/convert")) {
			void handleConvert(request, response);
			return;
		}

		response.writeHead(404, { "Content-Type": "application/json" });
		response.end(JSON.stringify({ error: "Not found." }));
	}).listen(8080, "0.0.0.0");
}
