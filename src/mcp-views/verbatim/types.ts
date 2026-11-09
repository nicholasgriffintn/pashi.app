import { isRecord } from "../../shared/records";

export interface VerbatimWord {
	probability: number | null;
	removed: boolean;
	text: string;
}

export interface Timings {
	decideMs: number;
	repairMs: number;
	transcribeMs: number;
}

export interface Reading {
	label: string;
	scale: string[];
	score: number;
}

export interface TranscribedSegment {
	checks: { coherent: number; fluent: number; speech: number; verbatim: number };
	delivery: { noise: Reading; pace: Reading; tone: Reading };
	model: string;
	rawText: string;
	repair: {
		applied: boolean;
		candidate: string;
		keptProbability: number;
		probability: number;
	} | null;
	status: "transcribed";
	text: string;
	timings: Timings;
	usage: { input_tokens: number; output_tokens: number };
	words: VerbatimWord[];
}

export type VerbatimSegment =
	| TranscribedSegment
	| { rawText: string; speech: number; status: "no_speech"; timings: Timings }
	| { status: "silence"; timings: Timings };

export type TranscribeResult =
	| { rawText: string; status: "drafted"; timings: Timings }
	| { status: "silence"; timings: Timings };

function isTimings(value: unknown): value is Timings {
	return (
		isRecord(value) &&
		typeof value.transcribeMs === "number" &&
		typeof value.decideMs === "number" &&
		typeof value.repairMs === "number"
	);
}

export function isTranscribeResult(value: unknown): value is TranscribeResult {
	return (
		isRecord(value) &&
		isTimings(value.timings) &&
		(value.status === "silence" ||
			(value.status === "drafted" && typeof value.rawText === "string"))
	);
}

function isWord(value: unknown): value is VerbatimWord {
	return (
		isRecord(value) &&
		typeof value.text === "string" &&
		typeof value.removed === "boolean" &&
		(value.probability === null || typeof value.probability === "number")
	);
}

export function isVerbatimSegment(value: unknown): value is VerbatimSegment {
	if (!isRecord(value) || !isTimings(value.timings)) {
		return false;
	}

	if (value.status === "silence") {
		return true;
	}

	if (value.status === "no_speech") {
		return typeof value.rawText === "string" && typeof value.speech === "number";
	}

	return (
		value.status === "transcribed" &&
		typeof value.text === "string" &&
		Array.isArray(value.words) &&
		value.words.every(isWord) &&
		isRecord(value.checks) &&
		isRecord(value.delivery) &&
		isRecord(value.usage)
	);
}
