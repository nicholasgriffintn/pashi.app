import type { PolisRecording } from "../../../shared/polis";
import { YEAR_DAYS, advanceTo, createKeyframe, createWorld } from "../library/index";
import { emptyDecisionStats } from "./decision-budget";
import { KEYFRAME_YEARS, captureKeyframe } from "./keyframes";
import { positionFor } from "./playback";
import { enterPlayback } from "./playback-control";
import type { EngineState, Restoring } from "./state";
import { sendStatus } from "./status";
import { STEP_BUDGET_MS } from "./stepping";

const MORNING = 8;

function finishRestore(state: EngineState, { branch, watch }: Restoring): void {
	state.restoring = null;
	state.branches = [branch];
	state.activeBranch = 0;
	state.lastSavedYear = Math.floor(branch.world.day / YEAR_DAYS);
	state.renderer?.attach(branch.world);

	if (watch) {
		enterPlayback(state, positionFor(0, MORNING));
	}

	sendStatus(state);
}

export function stepRestore(state: EngineState, active: Restoring, now: number): void {
	const { branch, log, endDay } = active;
	const deadline = now + STEP_BUDGET_MS;

	while (performance.now() < deadline) {
		const boundary =
			(Math.floor(branch.world.day / (YEAR_DAYS * KEYFRAME_YEARS)) + 1) *
			YEAR_DAYS *
			KEYFRAME_YEARS;
		const finished = advanceTo(branch.world, log, Math.min(boundary, endDay), deadline);

		if (finished) {
			captureKeyframe(branch);
		}

		if (finished && branch.world.day >= endDay) {
			finishRestore(state, active);

			return;
		}
	}

	state.post({ type: "restoring", name: branch.world.name, day: branch.world.day, endDay });
}

export function restore(state: EngineState, recording: PolisRecording, watch: boolean): void {
	const world = createWorld({
		id: recording.id,
		name: recording.name,
		population: recording.population,
		seed: recording.seed,
	});

	state.stats = emptyDecisionStats();
	state.pending.clear();
	state.playback = null;
	state.running = false;
	state.queuedDays = 0;
	state.restoring = {
		branch: { label: "This town", world, keyframes: [createKeyframe(world)] },
		log: recording.log,
		endDay: recording.day,
		watch,
	};
}
