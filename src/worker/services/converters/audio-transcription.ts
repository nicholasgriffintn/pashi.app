import type { UploadedFile } from "../../utils/body.ts";
import { bytesToBase64 } from "../../utils/generation.ts";
import { segmentsToSrt, segmentsToVtt, type SubtitleSegment } from "../../utils/subtitles.ts";
import { fileExtension, safeFilename } from "../../utils/text.ts";

export const AUDIO_TRANSCRIPTION_FORMATS = ["text", "vtt", "srt"] as const;
export const AUDIO_TRANSCRIPTION_MAX_BYTES = 16 * 1024 * 1024;
export const AUDIO_TRANSCRIPTION_MODEL = "@cf/openai/whisper-large-v3-turbo";

export type AudioTranscriptionFormat = (typeof AUDIO_TRANSCRIPTION_FORMATS)[number];

const AUDIO_EXTENSIONS = new Set(["flac", "m4a", "mp3", "ogg", "wav", "webm"]);
const LANGUAGE_PATTERN = /^[a-z]{2,3}$/;

const OUTPUTS: Record<AudioTranscriptionFormat, { extension: string; mimeType: string }> = {
	srt: { extension: "srt", mimeType: "application/x-subrip;charset=utf-8" },
	text: { extension: "txt", mimeType: "text/plain;charset=utf-8" },
	vtt: { extension: "vtt", mimeType: "text/vtt;charset=utf-8" },
};

export const AUDIO_TRANSCRIPTION_EXTENSIONS = [...AUDIO_EXTENSIONS].map(
	(extension) => `.${extension}`,
);

export class AudioTranscriptionError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "AudioTranscriptionError";
		this.status = status;
	}
}

export interface AudioTranscriptionResult {
	content: string;
	downloadName: string;
	language: string;
	mimeType: string;
	seconds: number;
}

export function isAudioTranscriptionFormat(value: string): value is AudioTranscriptionFormat {
	return AUDIO_TRANSCRIPTION_FORMATS.some((format) => format === value);
}

export function normaliseTranscriptionLanguage(value: string | undefined) {
	const language = value?.trim().toLowerCase();

	if (!language) {
		return undefined;
	}

	if (!LANGUAGE_PATTERN.test(language)) {
		throw new AudioTranscriptionError(
			"Use a two or three letter language code such as en, fr or de.",
			422,
		);
	}

	return language;
}

function assertAudio(file: UploadedFile) {
	if (file.bytes.byteLength > AUDIO_TRANSCRIPTION_MAX_BYTES) {
		throw new AudioTranscriptionError(
			`Audio is larger than the ${AUDIO_TRANSCRIPTION_MAX_BYTES / (1024 * 1024)} MiB limit.`,
			422,
		);
	}

	const extension = fileExtension(file.name);

	if (!AUDIO_EXTENSIONS.has(extension)) {
		throw new AudioTranscriptionError(
			extension
				? `.${extension} files are not supported. Upload MP3, WAV, FLAC, OGG, M4A or WebM audio.`
				: "Name the file with its extension, for example with sourceName=talk.mp3. Upload MP3, WAV, FLAC, OGG, M4A or WebM audio.",
			415,
		);
	}
}

function toSegments(segments: ReadonlyArray<{ end?: number; start?: number; text?: string }>) {
	return segments.flatMap((segment): SubtitleSegment[] =>
		segment.text?.trim()
			? [{ end: segment.end ?? 0, start: segment.start ?? 0, text: segment.text }]
			: [],
	);
}

export async function transcribeAudio(
	ai: Ai,
	file: UploadedFile,
	format: AudioTranscriptionFormat,
	language: string | undefined,
): Promise<AudioTranscriptionResult> {
	assertAudio(file);

	let output: Ai_Cf_Openai_Whisper_Large_V3_Turbo_Output;

	try {
		output = await ai.run(AUDIO_TRANSCRIPTION_MODEL, {
			audio: bytesToBase64(file.bytes),
			task: "transcribe",
			...(language ? { language } : {}),
		});
	} catch {
		throw new AudioTranscriptionError("The audio could not be transcribed.", 422);
	}

	const text = output.text?.trim() ?? "";

	if (!text) {
		throw new AudioTranscriptionError("No speech was found in this audio.", 422);
	}

	const content =
		format === "vtt"
			? segmentsToVtt(toSegments(output.segments ?? []))
			: format === "srt"
				? segmentsToSrt(toSegments(output.segments ?? []))
				: text;

	if (!content) {
		throw new AudioTranscriptionError("The model returned no timed segments.", 422);
	}

	const stem = safeFilename(file.name.replace(/\.[a-z0-9]{1,8}$/i, "") || "audio");
	const target = OUTPUTS[format];

	return {
		content,
		downloadName: `pashi-${stem}.${target.extension}`,
		language: output.transcription_info?.language ?? language ?? "unknown",
		mimeType: target.mimeType,
		seconds: Math.round(output.transcription_info?.duration ?? 0),
	};
}
