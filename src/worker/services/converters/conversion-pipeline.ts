import { Container, getContainer } from "@cloudflare/containers";

import { safeFilename } from "../../utils/text";
import type { ConverterResult } from "./types";

export type QueuedConversionKind = "audio" | "document" | "image" | "video";
export type QueuedConversionStatus = "complete" | "failed" | "processing" | "queued";

export interface ConversionJobMessage {
	converterId: string;
	inputContentType: string;
	jobId: string;
	kind: QueuedConversionKind;
	outputFormat: string;
	outputKey: string;
	sourceKey: string;
	sourceName: string;
}

export interface ConversionEnv extends Env {
	CONVERSION_BUCKET: R2Bucket;
	CONVERSION_CONTAINER: DurableObjectNamespace<ConversionContainer>;
	CONVERSION_QUEUE: Queue<ConversionJobMessage>;
}

interface ConversionJobRecord extends ConversionJobMessage {
	createdAt: string;
	downloadUrl?: string;
	error?: string;
	status: QueuedConversionStatus;
	statusUrl: string;
	updatedAt: string;
}

interface UploadedConversionSource {
	body: Blob | ReadableStream;
	contentType: string;
	fields: Record<string, string>;
	name: string;
}

const OUTPUT_FORMAT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const KNOWN_AUDIO_OUTPUT_FORMATS = new Set(["aac", "aiff", "alac", "flac", "m4a", "mka", "mp3", "oga", "ogg", "opus", "wav", "wma"]);
const KNOWN_DOCUMENT_OUTPUT_FORMATS = new Set(["docx", "epub", "html", "md", "odt", "rtf", "txt"]);
const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
const CONTAINER_PORT = 8080;
const JOB_PREFIX = "conversions";

export class ConversionContainer extends Container<ConversionEnv> {
	defaultPort = CONTAINER_PORT;
	enableInternet = false;
	envVars = {
		NODE_ENV: "production",
	};
	sleepAfter = "10m";

	async fetch(request: Request) {
		return this.containerFetch(request);
	}
}

export async function createQueuedConversionUploadResponse(
	converterId: string,
	request: Request,
	env: ConversionEnv,
) {
	const kind = queuedConversionKindForConverter(converterId);
	if (!kind) {
		return Response.json({ error: "Queued converter not found." }, { status: 404 });
	}

	const source = await readUploadedConversionSource(request);
	if (!source) {
		return Response.json({ error: "Upload a file to convert." }, { status: 400 });
	}

	const outputFormat = normaliseOutputFormat(kind, source.fields.outputFormat || source.fields.format);
	if (!outputFormat) {
		return Response.json({ error: "Choose a safe ffmpeg output format such as webp, mp4, or mp3." }, { status: 400 });
	}

	const now = new Date().toISOString();
	const jobId = crypto.randomUUID();
	const sourceName = safeFilename(source.name);
	const sourceKey = `${JOB_PREFIX}/${jobId}/source-${sourceName}`;
	const outputKey = `${JOB_PREFIX}/${jobId}/output.${extensionForFormat(outputFormat)}`;
	const message: ConversionJobMessage = {
		converterId,
		inputContentType: source.contentType,
		jobId,
		kind,
		outputFormat,
		outputKey,
		sourceKey,
		sourceName,
	};
	const record: ConversionJobRecord = {
		...message,
		createdAt: now,
		status: "queued",
		statusUrl: statusUrl(converterId, jobId),
		updatedAt: now,
	};

	await env.CONVERSION_BUCKET.put(sourceKey, source.body, {
		httpMetadata: { contentType: source.contentType },
	});
	await writeJobRecord(env, record);
	await env.CONVERSION_QUEUE.send(message, { contentType: "json" });

	return Response.json(createJobResult(record), { status: 202 });
}

export async function createQueuedConversionLookupResponse(
	converterId: string,
	fields: Record<string, string>,
	env: ConversionEnv,
) {
	const jobId = fields.job || fields.download;
	if (!jobId) {
		return undefined;
	}

	const record = await readJobRecord(env, jobId);
	if (!record || record.converterId !== converterId) {
		return Response.json({ error: "Conversion job not found." }, { status: 404 });
	}

	if (fields.download) {
		if (record.status !== "complete") {
			return Response.json({ error: "Conversion job is not complete yet." }, { status: 409 });
		}

		const object = await env.CONVERSION_BUCKET.get(record.outputKey);
		if (!object) {
			return Response.json({ error: "Converted file is missing." }, { status: 404 });
		}

		const headers = new Headers();
		object.writeHttpMetadata(headers);
		headers.set("Content-Disposition", `attachment; filename="pashi-${record.jobId}.${extensionForFormat(record.outputFormat)}"`);
		headers.set("Content-Type", headers.get("Content-Type") || contentTypeForOutput(record.kind, record.outputFormat));
		headers.set("Cache-Control", "no-store");
		return new Response(object.body, { headers });
	}

	return Response.json(createJobResult(record));
}

export async function processConversionQueue(batch: MessageBatch<ConversionJobMessage>, env: ConversionEnv) {
	for (const message of batch.messages) {
		try {
			await processConversionJob(message.body, env);
			message.ack();
		} catch (error) {
			await markJobFailed(message.body, env, error);
			message.retry();
		}
	}
}

async function processConversionJob(message: ConversionJobMessage, env: ConversionEnv) {
	await updateJobStatus(env, message.jobId, "processing");

	const source = await env.CONVERSION_BUCKET.get(message.sourceKey);
	if (!source) {
		throw new Error("Source object is missing.");
	}

	const fixedLengthBody = new FixedLengthStream(source.size);
	const bodyPipe = source.body.pipeTo(fixedLengthBody.writable);
	const container = getContainer(env.CONVERSION_CONTAINER, "media-converter");
	const url = new URL("http://localhost/convert");
	url.searchParams.set("kind", message.kind);
	url.searchParams.set("outputFormat", message.outputFormat);
	url.searchParams.set("sourceName", message.sourceName);
	const response = await container.fetch(new Request(url, {
		body: fixedLengthBody.readable,
		headers: {
			"Content-Length": String(source.size),
			"Content-Type": message.inputContentType,
		},
		method: "POST",
	}));
	await bodyPipe;

	if (!response.ok || !response.body) {
		throw new Error(await response.text());
	}

	const outputBody = await createKnownLengthBody(response);
	await env.CONVERSION_BUCKET.put(message.outputKey, outputBody.body, {
		httpMetadata: {
			contentType: contentTypeForOutput(message.kind, message.outputFormat),
		},
	});
	await outputBody.done;
	await updateJobStatus(env, message.jobId, "complete", {
		downloadUrl: downloadUrl(message.converterId, message.jobId),
	});
}

async function readUploadedConversionSource(request: Request): Promise<UploadedConversionSource | undefined> {
	const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
	const contentLength = Number(request.headers.get("content-length") ?? 0);
	if (contentLength > MAX_UPLOAD_BYTES) {
		return undefined;
	}

	const url = new URL(request.url);
	const fields = Object.fromEntries(url.searchParams.entries());
	for (const key of ["data", "file", "input"]) {
		delete fields[key];
	}

	if (contentType.includes("multipart/form-data")) {
		const formData = await request.formData();
		for (const [key, value] of formData.entries()) {
			if (typeof value === "string" && key !== "input" && key !== "data") {
				fields[key] = value;
			}
		}

		const file = formData.get("file");
		if (!(file instanceof File) || file.size > MAX_UPLOAD_BYTES) {
			return undefined;
		}

		return {
			body: file,
			contentType: file.type || "application/octet-stream",
			fields,
			name: file.name || "upload",
		};
	}

	if (!request.body) {
		return undefined;
	}

	return {
		body: request.body,
		contentType: contentType || "application/octet-stream",
		fields,
		name: fields.sourceName || fields.name || "upload",
	};
}

async function readJobRecord(env: ConversionEnv, jobId: string) {
	const object = await env.CONVERSION_BUCKET.get(jobRecordKey(jobId));
	if (!object) {
		return undefined;
	}

	return object.json<ConversionJobRecord>();
}

async function writeJobRecord(env: ConversionEnv, record: ConversionJobRecord) {
	await env.CONVERSION_BUCKET.put(jobRecordKey(record.jobId), JSON.stringify(record), {
		httpMetadata: { contentType: "application/json;charset=utf-8" },
	});
}

async function updateJobStatus(
	env: ConversionEnv,
	jobId: string,
	status: QueuedConversionStatus,
	patch: Partial<ConversionJobRecord> = {},
) {
	const record = await readJobRecord(env, jobId);
	if (!record) {
		throw new Error("Conversion job not found.");
	}

	await writeJobRecord(env, {
		...record,
		...patch,
		status,
		updatedAt: new Date().toISOString(),
	});
}

async function markJobFailed(message: ConversionJobMessage, env: ConversionEnv, error: unknown) {
	try {
		await updateJobStatus(env, message.jobId, "failed", {
			error: error instanceof Error ? error.message : "Conversion failed.",
		});
	} catch {
		await writeJobRecord(env, {
			...message,
			createdAt: new Date().toISOString(),
			error: error instanceof Error ? error.message : "Conversion failed.",
			status: "failed",
			statusUrl: statusUrl(message.converterId, message.jobId),
			updatedAt: new Date().toISOString(),
		});
	}
}

function createJobResult(record: ConversionJobRecord): ConverterResult {
	return {
		generatedAt: record.updatedAt,
		input: record.sourceName,
		kind: "fields",
		label: `${record.kind} conversion job`,
		meta: record.status,
		result: {
			downloadUrl: record.downloadUrl ?? "",
			error: record.error ?? "",
			jobId: record.jobId,
			outputFormat: record.outputFormat,
			status: record.status,
			statusUrl: record.statusUrl,
		},
		type: record.converterId,
	};
}

function jobRecordKey(jobId: string) {
	return `${JOB_PREFIX}/${jobId}/job.json`;
}

function queuedConversionKindForConverter(converterId: string): QueuedConversionKind | undefined {
	if (converterId === "image-format") {
		return "image";
	}
	if (converterId === "audio-format") {
		return "audio";
	}
	if (converterId === "document-format") {
		return "document";
	}
	if (converterId === "video-format") {
		return "video";
	}
	return undefined;
}

function normaliseOutputFormat(kind: QueuedConversionKind, value: string | undefined) {
	const defaultFormat = kind === "image" ? "webp" : kind === "audio" ? "mp3" : kind === "document" ? "docx" : "mp4";
	const format = value?.trim().toLowerCase() || defaultFormat;
	if (!OUTPUT_FORMAT_PATTERN.test(format)) {
		return undefined;
	}

	return format === "jpg" ? "jpeg" : format;
}

function extensionForFormat(format: string) {
	return format === "jpeg" ? "jpg" : format;
}

function contentTypeForOutput(kind: QueuedConversionKind, outputFormat: string) {
	switch (outputFormat) {
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
		case "mkv":
		case "mka":
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
		return "image/" + outputFormat;
	}
	if (kind === "audio" || KNOWN_AUDIO_OUTPUT_FORMATS.has(outputFormat)) {
		return "audio/" + outputFormat;
	}
	if (kind === "document" || KNOWN_DOCUMENT_OUTPUT_FORMATS.has(outputFormat)) {
		return "application/octet-stream";
	}

	return "video/" + outputFormat;
}

async function createKnownLengthBody(response: Response): Promise<{ body: ArrayBuffer | ReadableStream; done?: Promise<void> }> {
	const contentLength = Number(response.headers.get("Content-Length") ?? 0);
	if (response.body && Number.isSafeInteger(contentLength) && contentLength > 0) {
		const fixedLengthBody = new FixedLengthStream(contentLength);
		return {
			body: fixedLengthBody.readable,
			done: response.body.pipeTo(fixedLengthBody.writable),
		};
	}

	return {
		body: await response.arrayBuffer(),
	};
}

function statusUrl(converterId: string, jobId: string) {
	return `/api/${converterId}?job=${encodeURIComponent(jobId)}`;
}

function downloadUrl(converterId: string, jobId: string) {
	return `/api/${converterId}?download=${encodeURIComponent(jobId)}`;
}
