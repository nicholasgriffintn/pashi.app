export const VERBATIM_MAX_JUDGED_WORDS = 56;

export const PACE_LEVELS = ["Very slow", "Slow", "Conversational", "Fast", "Very fast"];
export const NOISE_LEVELS = [
	"Studio clean",
	"Quiet room",
	"Some background",
	"Noisy",
	"Very noisy",
];
export const TONES = {
	cheerful: "Cheerful or warm",
	excited: "Excited or animated",
	frustrated: "Frustrated or annoyed",
	neutral: "Neutral, matter-of-fact",
	questioning: "Questioning or uncertain",
	sad: "Sad or subdued",
} as const;

export const wordQuestionId = (index: number) => `w${index}`;

export function buildSegmentQuestions(words: readonly string[]) {
	const questions: Record<string, unknown> = {
		coherent: {
			instructions: "Does `transcript` read as a plausible continuation of `previous`?",
			type: "noul",
		},
		fluent: {
			instructions:
				"Is `transcript` plausible, fluent English made of natural sentences? A sentence cut off at the very start or end of the clip is fine.",
			type: "noul",
		},
		noise: {
			criteria: NOISE_LEVELS,
			instructions: "How much background noise is in the audio?",
			type: "score",
		},
		pace: {
			criteria: PACE_LEVELS,
			instructions: "How quickly is the speaker talking?",
			type: "score",
		},
		speech: {
			instructions: "Does the audio contain intelligible human speech?",
			type: "noul",
		},
		tone: {
			criteria: TONES,
			instructions: "Which best describes the speaker's tone of voice?",
			type: "choice",
		},
		verbatim: {
			instructions:
				"Is `transcript` an exact word-for-word match of everything spoken in the audio, with no missing, extra or changed words?",
			type: "noul",
		},
	};

	words.slice(0, VERBATIM_MAX_JUDGED_WORDS).forEach((word, index) => {
		questions[wordQuestionId(index)] = {
			instructions: `Word ${index + 1} of \`transcript\` is "${word}". Is that word actually spoken in the audio at that point?`,
			type: "noul",
		};
	});

	return questions;
}

export function buildRepairQuestions(candidates: Record<string, string>) {
	return {
		candidate: {
			criteria: candidates,
			instructions:
				"Which candidate is the exact word-for-word transcript of what is spoken in the audio, reading as plausible English?",
			type: "choice",
		},
	};
}
