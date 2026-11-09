import { pcm16Level } from "./audio";

export const SEGMENT_SAMPLE_RATE = 16000;

const GATE = {
	continueLevelThreshold: 0.03,
	minSpeechMs: 250,
	silenceMs: 450,
	startLevelThreshold: 0.05,
};
const MAX_SEGMENT_MS = 10_000;
const PRE_ROLL_MS = 400;

function chunkMs(chunk: ArrayBuffer) {
	return (chunk.byteLength / 2 / SEGMENT_SAMPLE_RATE) * 1000;
}

class SpeechGate {
	private lastSpeechAt = 0;
	private speechStartedAt = 0;
	private turnHasSpeech = false;

	observe(level: number, now: number) {
		const threshold = this.turnHasSpeech ? GATE.continueLevelThreshold : GATE.startLevelThreshold;

		if (level < threshold) {
			return false;
		}

		if (!this.turnHasSpeech) {
			this.speechStartedAt = now;
		}

		this.lastSpeechAt = now;
		this.turnHasSpeech = true;

		return true;
	}

	shouldCommit(now: number) {
		if (!this.turnHasSpeech) {
			return false;
		}

		const enoughSilence = now - this.lastSpeechAt >= GATE.silenceMs;
		const enoughSpeech = this.lastSpeechAt - this.speechStartedAt >= GATE.minSpeechMs;

		if (!enoughSilence || !enoughSpeech) {
			return false;
		}

		this.reset();

		return true;
	}

	reset() {
		this.lastSpeechAt = 0;
		this.speechStartedAt = 0;
		this.turnHasSpeech = false;
	}
}

export interface SpeechSegmenterStep {
	level: number;
	segment: ArrayBuffer[] | null;
}

export class SpeechSegmenter {
	private readonly gate = new SpeechGate();
	private chunks: ArrayBuffer[] = [];
	private bufferedMs = 0;
	private heardSpeech = false;

	push(chunk: ArrayBuffer, now: number): SpeechSegmenterStep {
		const level = pcm16Level(chunk);

		this.chunks.push(chunk);
		this.bufferedMs += chunkMs(chunk);

		if (this.gate.observe(level, now)) {
			this.heardSpeech = true;
		}

		if (!this.heardSpeech) {
			this.trimToPreRoll();

			return { level, segment: null };
		}

		if (this.gate.shouldCommit(now) || this.bufferedMs >= MAX_SEGMENT_MS) {
			return { level, segment: this.take() };
		}

		return { level, segment: null };
	}

	flush() {
		return this.heardSpeech ? this.take() : null;
	}

	private take() {
		const segment = this.chunks;

		this.chunks = [];
		this.bufferedMs = 0;
		this.heardSpeech = false;
		this.gate.reset();

		return segment;
	}

	private trimToPreRoll() {
		while (this.chunks.length > 1 && this.bufferedMs - chunkMs(this.chunks[0]) >= PRE_ROLL_MS) {
			const dropped = this.chunks.shift();

			this.bufferedMs -= dropped ? chunkMs(dropped) : 0;
		}
	}
}

export function segmentDurationMs(chunks: readonly ArrayBuffer[]) {
	return (
		(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0) / 2 / SEGMENT_SAMPLE_RATE) * 1000
	);
}
