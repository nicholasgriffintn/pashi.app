import { MONTH_DAYS, YEAR_DAYS, stepDay, type World } from "../library/index";
import { holdingForAnswers } from "./decision-flow";
import { captureKeyframe } from "./keyframes";
import { POLIS_SPEEDS } from "./protocol";
import type { EngineState } from "./state";

export const STEP_BUDGET_MS = 11;

function advance(state: EngineState, world: World): void {
	const yearBefore = Math.floor(world.day / YEAR_DAYS);

	for (const branch of state.branches) {
		stepDay(branch.world);
		captureKeyframe(branch);
	}

	state.measuredDays += 1;

	if (Math.floor(world.day / YEAR_DAYS) !== yearBefore) {
		state.stats = { ...state.stats, callsThisYear: 0 };
	}
}

export function stepWorlds(state: EngineState, world: World, elapsed: number, now: number): void {
	const { daysPerSecond: speed } = POLIS_SPEEDS[state.speedIndex];

	state.dayCarry += (elapsed / 1000) * speed;

	const deadline = now + STEP_BUDGET_MS;

	while (state.dayCarry >= 1 && performance.now() < deadline) {
		if (holdingForAnswers(state, world) && world.day % MONTH_DAYS === 0) {
			state.dayCarry = 0;
			break;
		}

		advance(state, world);
		state.dayCarry -= 1;
	}

	state.dayCarry = Math.min(state.dayCarry, Math.max(speed, 1));
	state.dayFraction = state.dayCarry % 1;
}

export function stepQueuedDays(state: EngineState, world: World, now: number): boolean {
	if (state.queuedDays === 0) {
		return false;
	}

	const deadline = now + STEP_BUDGET_MS;

	do {
		advance(state, world);
		state.queuedDays -= 1;
	} while (state.queuedDays > 0 && performance.now() < deadline);

	return true;
}

export function measureSpeed(state: EngineState, now: number): void {
	if (now - state.measuredSince >= 1000) {
		state.daysPerSecond = (state.measuredDays * 1000) / (now - state.measuredSince);
		state.measuredDays = 0;
		state.measuredSince = now;
	}
}

export function autosaveOnNewYear(state: EngineState, world: World): void {
	const year = Math.floor(world.day / YEAR_DAYS);

	if (year > state.lastSavedYear) {
		state.lastSavedYear = year;
		state.post({ type: "autosave" });
	}
}
