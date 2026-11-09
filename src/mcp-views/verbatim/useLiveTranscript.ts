import { useCallback, useEffect, useRef, useState } from "react";

import { errorMessage } from "../shared/errors";
import { host } from "../shared/host";
import {
	encodePcm16Wav,
	requestMicrophone,
	startPcm16Microphone,
	stopMediaStream,
	wavDataUrl,
	type MicrophoneController,
} from "./audio";
import { SEGMENT_SAMPLE_RATE, segmentDurationMs, SpeechSegmenter } from "./segmenter";
import { isTranscribeResult, isVerbatimSegment, type VerbatimSegment } from "./types";

export type LiveTranscriptStatus = "idle" | "listening" | "starting";

export type TranscriptEntry =
	| { durationMs: number; id: number; state: "pending" }
	| { draft: string; durationMs: number; id: number; state: "drafted" }
	| { draft: string; durationMs: number; id: number; reason: string; state: "unchecked" }
	| { durationMs: number; error: string; id: number; state: "failed" }
	| { durationMs: number; id: number; result: VerbatimSegment; roundTripMs: number; state: "done" };

export function transcriptText(entries: readonly TranscriptEntry[]) {
	return entries
		.flatMap((entry) => {
			if (entry.state === "unchecked") {
				return [entry.draft];
			}

			return entry.state === "done" && entry.result.status === "transcribed" && entry.result.text
				? [entry.result.text]
				: [];
		})
		.join(" ");
}

export function useLiveTranscript(contextLength: number) {
	const [status, setStatus] = useState<LiveTranscriptStatus>("idle");
	const [entries, setEntries] = useState<TranscriptEntry[]>([]);
	const [level, setLevel] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const controllerRef = useRef<MicrophoneController | null>(null);
	const segmenterRef = useRef(new SpeechSegmenter());
	const transcriptRef = useRef("");
	const nextIdRef = useRef(1);

	const updateEntry = useCallback((entry: TranscriptEntry) => {
		setEntries((current) => current.map((item) => (item.id === entry.id ? entry : item)));
	}, []);

	const verify = useCallback(
		async (id: number, durationMs: number, audio: string) => {
			const started = performance.now();
			const context = transcriptRef.current.slice(-contextLength);
			let draft = "";

			try {
				const transcribed = await host.callTool(
					"pashi_transcribe_verbatim",
					{ audio },
					isTranscribeResult,
				);

				if (transcribed.status === "silence") {
					updateEntry({
						durationMs,
						id,
						result: transcribed,
						roundTripMs: performance.now() - started,
						state: "done",
					});

					return;
				}

				draft = transcribed.rawText;
				transcriptRef.current = `${transcriptRef.current} ${draft}`.trim();
				updateEntry({ draft, durationMs, id, state: "drafted" });

				const result = await host.callTool(
					"pashi_check_verbatim",
					{ audio, context, transcribeMs: transcribed.timings.transcribeMs, transcript: draft },
					isVerbatimSegment,
				);

				updateEntry({
					durationMs,
					id,
					result,
					roundTripMs: performance.now() - started,
					state: "done",
				});
			} catch (caught) {
				const message = errorMessage(caught, "This phrase could not be checked");

				updateEntry(
					draft
						? { draft, durationMs, id, reason: message, state: "unchecked" }
						: { durationMs, error: message, id, state: "failed" },
				);
			}
		},
		[contextLength, updateEntry],
	);

	const submit = useCallback(
		(chunks: ArrayBuffer[]) => {
			const id = nextIdRef.current;
			const durationMs = segmentDurationMs(chunks);
			const audio = wavDataUrl(encodePcm16Wav(chunks, SEGMENT_SAMPLE_RATE));

			nextIdRef.current += 1;
			setEntries((current) => [...current, { durationMs, id, state: "pending" }]);
			void verify(id, durationMs, audio);
		},
		[verify],
	);

	const stop = useCallback(() => {
		controllerRef.current?.stop();
		controllerRef.current = null;
		stopMediaStream(streamRef.current);
		streamRef.current = null;

		const remaining = segmenterRef.current.flush();

		if (remaining) {
			submit(remaining);
		}

		setLevel(0);
		setStatus("idle");
	}, [submit]);

	const start = useCallback(async () => {
		setError(null);
		setStatus("starting");

		try {
			const stream = await requestMicrophone();

			streamRef.current = stream;
			segmenterRef.current = new SpeechSegmenter();
			controllerRef.current = await startPcm16Microphone({
				onChunk: (chunk) => {
					const step = segmenterRef.current.push(chunk, Date.now());

					setLevel(step.level);

					if (step.segment) {
						submit(step.segment);
					}
				},
				sampleRate: SEGMENT_SAMPLE_RATE,
				stream,
			});
			setStatus("listening");
		} catch (caught) {
			stopMediaStream(streamRef.current);
			streamRef.current = null;
			setStatus("idle");
			setError(
				caught instanceof Error && caught.name === "NotAllowedError"
					? "Microphone access was refused. Allow it in your browser and try again."
					: "The microphone would not start.",
			);
		}
	}, [submit]);

	const clear = useCallback(() => {
		transcriptRef.current = "";
		setEntries([]);
	}, []);

	useEffect(
		() => () => {
			controllerRef.current?.stop();
			stopMediaStream(streamRef.current);
		},
		[],
	);

	return { clear, entries, error, level, start, status, stop };
}
