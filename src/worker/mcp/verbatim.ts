import { isRecord } from "../../shared/records";
import type { AiClient } from "../ai/run";
import type { WorkersAiEnv } from "../ai/workers-ai";
import { invalidRequest } from "../services/generators/errors";
import { createDecision } from "../services/polychat/client";
import {
	normaliseDecisionScore,
	readDecisionAnswers,
	readDecisionChoice,
	readDecisionNoul,
	readDecisionScore,
	roundDecisionScore,
} from "../services/polychat/decisions";
import type { PolychatSessionEnv } from "../services/polychat/session";
import { readBase64DataUrl } from "../utils/data-url";
import { capitaliseFirst, splitWords } from "../utils/text";
import { requirePolychatPro } from "./pro-gate";
import {
	buildRepairQuestions,
	buildSegmentQuestions,
	NOISE_LEVELS,
	PACE_LEVELS,
	TONES,
	VERBATIM_MAX_JUDGED_WORDS,
	wordQuestionId,
} from "./verbatim-questions";
import { applyRepair, planRepair, type VerbatimRepair, type VerbatimWord } from "./verbatim-repair";

export const VERBATIM_LIMITS = {
	contextLength: 600,
	segmentMaxBytes: 2 * 1024 * 1024,
	transcriptLength: 2000,
};

const APP_NAME = "Verbatim";
const AUDIO_TYPES = ["audio/wav"];
const SPEECH_THRESHOLD = 0.5;
const TRANSCRIPTION_MODEL = "@cf/openai/whisper-large-v3-turbo";
const TONE_SCALE = Object.keys(TONES).map(capitaliseFirst);

interface Timings {
	decideMs: number;
	repairMs: number;
	transcribeMs: number;
}

interface Reading {
	label: string;
	scale: string[];
	score: number;
}

export type VerbatimSegment =
	| { status: "no_speech"; rawText: string; speech: number; timings: Timings }
	| { status: "silence"; timings: Timings }
	| {
			checks: { coherent: number; fluent: number; speech: number; verbatim: number };
			delivery: { noise: Reading; pace: Reading; tone: Reading };
			model: string;
			rawText: string;
			repair: VerbatimRepair | null;
			status: "transcribed";
			text: string;
			timings: Timings;
			usage: { input_tokens: number; output_tokens: number };
			words: VerbatimWord[];
	  };

function readAudio(value: unknown) {
	const audio = readBase64DataUrl(value, AUDIO_TYPES);

	if (!audio) {
		throw invalidRequest("Send the phrase as a base64 audio/wav data URL.");
	}

	if (audio.bytes > VERBATIM_LIMITS.segmentMaxBytes) {
		throw invalidRequest("Audio segments must be under 2MB");
	}

	return audio.dataUrl;
}

function readTranscript(value: unknown) {
	const text = typeof value === "string" ? value.trim() : "";

	if (!text || text.length > VERBATIM_LIMITS.transcriptLength) {
		throw invalidRequest("Send the transcript Pashi returned for this phrase.");
	}

	return text;
}

function readContext(value: unknown) {
	return typeof value === "string" ? value.trim().slice(-VERBATIM_LIMITS.contextLength) : "";
}

async function timed<T>(work: () => Promise<T>): Promise<[T, number]> {
	const started = Date.now();
	const value = await work();

	return [value, Date.now() - started];
}

function scoreReading(answer: unknown, scale: string[]): Reading {
	const score = readDecisionScore(answer);

	return score
		? { label: scale[roundDecisionScore(score)] ?? "", scale, score: normaliseDecisionScore(score) }
		: { label: "", scale, score: 0 };
}

function toneReading(answer: unknown): Reading {
	const choice = readDecisionChoice(answer);

	return choice
		? { label: capitaliseFirst(choice.choice), scale: TONE_SCALE, score: choice.confidence }
		: { label: "", scale: TONE_SCALE, score: 0 };
}

function readUsage(response: unknown) {
	const usage = isRecord(response) && isRecord(response.usage) ? response.usage : {};

	return {
		input_tokens: typeof usage.input_tokens === "number" ? usage.input_tokens : 0,
		output_tokens: typeof usage.output_tokens === "number" ? usage.output_tokens : 0,
	};
}

function readModel(response: unknown) {
	return isRecord(response) && typeof response.model === "string" ? response.model : "";
}

export function setUpVerbatim() {
	return { app: "verbatim" };
}

export async function transcribeVerbatimSegment(
	argumentsValue: Record<string, unknown>,
	env: WorkersAiEnv,
) {
	const audio = readAudio(argumentsValue.audio);
	const [output, transcribeMs] = await timed<unknown>(() =>
		env.AI.run(TRANSCRIPTION_MODEL, { audio: audio.slice(audio.indexOf(",") + 1) }),
	);
	const rawText = isRecord(output) && typeof output.text === "string" ? output.text.trim() : "";
	const timings = { decideMs: 0, repairMs: 0, transcribeMs };

	return splitWords(rawText).length === 0
		? { status: "silence" as const, timings }
		: { rawText, status: "drafted" as const, timings };
}

export async function checkVerbatimSegment(
	argumentsValue: Record<string, unknown>,
	env: PolychatSessionEnv,
	ai: AiClient | undefined,
): Promise<VerbatimSegment> {
	const audio = readAudio(argumentsValue.audio);
	const rawText = readTranscript(argumentsValue.transcript);
	const transcribeMs =
		typeof argumentsValue.transcribeMs === "number" ? Math.max(0, argumentsValue.transcribeMs) : 0;
	const client = await requirePolychatPro(env, ai, APP_NAME, "check every word against the audio");
	const words = splitWords(rawText);
	const state = {
		previous: readContext(argumentsValue.context) || "(start of recording)",
		transcript: rawText,
	};
	const [judged, decideMs] = await timed(() =>
		createDecision(client.env, client.apiKey, {
			audio: [audio],
			questions: buildSegmentQuestions(words),
			state,
		}),
	);
	const answers = readDecisionAnswers(judged);
	const speech = readDecisionNoul(answers.speech);

	if (speech < SPEECH_THRESHOLD) {
		return {
			rawText,
			speech,
			status: "no_speech",
			timings: { decideMs, repairMs: 0, transcribeMs },
		};
	}

	const probabilities = words.map((_, index) =>
		index < VERBATIM_MAX_JUDGED_WORDS ? readDecisionNoul(answers[wordQuestionId(index)]) : null,
	);
	const plan = planRepair(words, probabilities);
	let repaired: ReturnType<typeof applyRepair> | null = null;
	let repairResponse: unknown = null;
	let repairMs = 0;

	if (plan) {
		[repairResponse, repairMs] = await timed(() =>
			createDecision(client.env, client.apiKey, {
				audio: [audio],
				questions: buildRepairQuestions(plan.candidates),
				state,
			}),
		);

		const choice = readDecisionChoice(readDecisionAnswers(repairResponse).candidate);

		if (choice) {
			repaired = applyRepair(words, probabilities, plan, choice);
		}
	}

	const finalWords =
		repaired?.words ??
		words.map((text, index) => ({
			probability: probabilities[index] ?? null,
			removed: false,
			text,
		}));
	const judgedUsage = readUsage(judged);
	const repairUsage = readUsage(repairResponse);

	return {
		checks: {
			coherent: readDecisionNoul(answers.coherent),
			fluent: readDecisionNoul(answers.fluent),
			speech,
			verbatim: readDecisionNoul(answers.verbatim),
		},
		delivery: {
			noise: scoreReading(answers.noise, NOISE_LEVELS),
			pace: scoreReading(answers.pace, PACE_LEVELS),
			tone: toneReading(answers.tone),
		},
		model: readModel(judged),
		rawText,
		repair: repaired?.repair ?? null,
		status: "transcribed",
		text: finalWords
			.filter((word) => !word.removed)
			.map((word) => word.text)
			.join(" "),
		timings: { decideMs, repairMs, transcribeMs },
		usage: {
			input_tokens: judgedUsage.input_tokens + repairUsage.input_tokens,
			output_tokens: judgedUsage.output_tokens + repairUsage.output_tokens,
		},
		words: finalWords,
	};
}
