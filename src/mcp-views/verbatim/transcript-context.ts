import { truncateStart } from "../shared/text";
import { summariseTranscript } from "./stats";
import { transcriptText, type TranscriptEntry } from "./useLiveTranscript";

const CONTEXT_TRANSCRIPT_LENGTH = 1600;

export function describeTranscript(entries: readonly TranscriptEntry[], listening: boolean) {
	const text = transcriptText(entries);
	const stats = summariseTranscript(entries);
	const lines = [
		"Pashi Verbatim state:",
		`Microphone: ${listening ? "listening" : "not listening"}`,
		`Words kept: ${stats.words}, words struck out as unheard: ${stats.struckWords}`,
	];

	if (!text) {
		return [...lines, "Transcript: empty"].join("\n");
	}

	return [
		...lines,
		text.length > CONTEXT_TRANSCRIPT_LENGTH
			? `Transcript (truncated, only the most recent ${CONTEXT_TRANSCRIPT_LENGTH} of ${text.length} characters):`
			: "Transcript:",
		truncateStart(text, CONTEXT_TRANSCRIPT_LENGTH),
	].join("\n");
}
