import { handleCommand } from "./commands";
import { flushDecisions } from "./decision-flow";
import { dayFractionOf } from "./playback";
import { stepPlayback } from "./playback-control";
import { POLIS_SPEEDS, type PolisEngineCore, type PolisEvent } from "./protocol";
import { stepRestore } from "./restore";
import { createState, liveBranch, type EngineState } from "./state";
import { sendStatus } from "./status";
import { autosaveOnNewYear, measureSpeed, stepQueuedDays, stepWorlds } from "./stepping";

const STATUS_INTERVAL_MS = 220;
const FAST_DAYS_PER_SECOND = 2;
const FRAME_FALLBACK_MS = 33;
const MAX_FRAME_MS = 250;

function runFrame(state: EngineState, elapsed: number, now: number): void {
	const live = liveBranch(state)?.world;
	const { playback, renderer } = state;

	if (!live) {
		return;
	}

	if (playback) {
		stepPlayback(state, playback, elapsed, now);
	} else if (state.queuedDays > 0) {
		stepQueuedDays(state, live, now);

		if (state.queuedDays === 0) {
			sendStatus(state);
		}
	} else if (state.running) {
		stepWorlds(state, live, elapsed, now);
		autosaveOnNewYear(state, live);
	}

	if (!playback) {
		flushDecisions(state, now);
	}

	measureSpeed(state, now);

	if (playback) {
		const fast = playback.playing && (playback.unit === "months" || playback.unit === "years");

		renderer?.render(playback.world, dayFractionOf(playback), now, fast);
	} else {
		renderer?.render(
			live,
			state.dayFraction,
			now,
			state.running && POLIS_SPEEDS[state.speedIndex].daysPerSecond >= FAST_DAYS_PER_SECOND,
		);
	}

	if (now - state.lastStatus >= STATUS_INTERVAL_MS) {
		state.lastStatus = now;
		sendStatus(state);
	}
}

function scheduleFrame(state: EngineState): void {
	if (state.disposed) {
		return;
	}

	const next = (now: number) => {
		if (state.disposed) {
			return;
		}

		const elapsed = Math.min(now - state.lastFrame, MAX_FRAME_MS);

		state.lastFrame = now;

		if (state.restoring) {
			stepRestore(state, state.restoring, now);
		} else {
			runFrame(state, elapsed, now);
		}

		scheduleFrame(state);
	};

	if (typeof requestAnimationFrame === "function") {
		requestAnimationFrame(next);
	} else {
		setTimeout(() => next(performance.now()), FRAME_FALLBACK_MS);
	}
}

export function createPolisEngine(post: (event: PolisEvent) => void): PolisEngineCore {
	const state = createState(post);

	state.lastFrame = performance.now();
	state.measuredSince = state.lastFrame;
	scheduleFrame(state);
	post({ type: "ready" });

	return {
		dispose: () => {
			state.disposed = true;
		},
		receive: (command) => handleCommand(state, command),
	};
}
