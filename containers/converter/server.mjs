import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { mkdir, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { pipeline } from "node:stream/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const OUTPUT_FORMAT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const AUDIO_OUTPUT_FORMATS = new Set(["aac", "aiff", "alac", "flac", "m4a", "mka", "mp3", "oga", "ogg", "opus", "wav", "wma"]);
const DOCUMENT_OUTPUT_FORMATS = new Set(["docx", "epub", "html", "md", "odt", "rtf", "txt"]);
const MAX_BYTES = 250 * 1024 * 1024;

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

function ffmpegArgs(kind, inputPath, outputPath, outputFormat) {
	const base = ["-hide_banner", "-loglevel", "error", "-y", "-i", inputPath];
	if (kind === "image") {
		return [...base, "-frames:v", "1", outputPath];
	}
	if (kind === "audio") {
		return [...base, "-vn", outputPath];
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
			return [...base, "-vn", outputPath];
		case "mp4":
		case "mov":
			return [...base, "-movflags", "+faststart", outputPath];
		case "webm":
			return [...base, "-c:v", "libvpx-vp9", "-c:a", "libopus", outputPath];
		default:
			return [...base, outputPath];
	}
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

async function runPandoc(args) {
	await runCommand("pandoc", args);
}

async function handleConvert(request, response) {
	const url = new URL(request.url, "http://localhost");
	const kind = url.searchParams.get("kind");
	const sourceExtension = extensionFromSourceName(url.searchParams.get("sourceName") ?? "");
	const outputFormat = normaliseFormat(kind ?? "", url.searchParams.get("outputFormat") ?? "");
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
		} else {
			await runFfmpeg(ffmpegArgs(kind, inputPath, outputPath, outputFormat));
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

createServer((request, response) => {
	if (request.method === "POST" && request.url?.startsWith("/convert")) {
		void handleConvert(request, response);
		return;
	}

	response.writeHead(404, { "Content-Type": "application/json" });
	response.end(JSON.stringify({ error: "Not found." }));
}).listen(8080, "0.0.0.0");
