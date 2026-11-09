import type { TranscriptEntry } from "./useLiveTranscript";

function mean(values: readonly number[]) {
	return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function summariseTranscript(entries: readonly TranscriptEntry[]) {
	const done = entries.flatMap((entry) => (entry.state === "done" ? [entry] : []));
	const transcribed = done.flatMap((entry) =>
		entry.result.status === "transcribed" ? [entry.result] : [],
	);
	const words = transcribed.flatMap((segment) => segment.words);
	const unchecked = entries.flatMap((entry) =>
		entry.state === "unchecked" ? entry.draft.split(/\s+/).filter(Boolean) : [],
	);

	return {
		meanFluent: mean(transcribed.map((segment) => segment.checks.fluent)),
		meanRoundTripMs: mean(done.map((entry) => entry.roundTripMs)),
		meanVerbatim: mean(transcribed.map((segment) => segment.checks.verbatim)),
		meanWordProbability: mean(
			words.flatMap((word) => (word.probability === null ? [] : [word.probability])),
		),
		phantoms: done.filter((entry) => entry.result.status === "no_speech").length,
		struckWords: words.filter((word) => word.removed).length,
		words: words.filter((word) => !word.removed).length + unchecked.length,
	};
}
