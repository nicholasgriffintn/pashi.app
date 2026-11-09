import { randomId } from "../../shared/ids";
import { YEAR_DAYS, continueFrom, createKeyframe } from "../library/index";
import {
	advancePosition,
	catchUp,
	createPlayback,
	nearestKeyframe,
	shouldJump,
	type Playback,
} from "./playback";
import { liveBranch, type EngineState } from "./state";

const LAST_POSITION_IN_DAY = 23 / 24;

export function seekTo(state: EngineState, position: number): void {
	const branch = liveBranch(state);
	const { playback } = state;

	if (!branch || !playback) {
		return;
	}

	const clamped = Math.min(branch.world.day + LAST_POSITION_IN_DAY, Math.max(0, position));
	const day = Math.floor(clamped);
	const keyframe = nearestKeyframe(branch.keyframes, day);

	playback.position = clamped;

	if (shouldJump(playback, keyframe, day)) {
		const followed = playback.world.followed;

		playback.world = structuredClone(keyframe);
		playback.world.followed = followed;
		state.renderer?.attach(playback.world);
	}

	state.seeking = playback.world.day !== day;
}

export function enterPlayback(state: EngineState, position: number): void {
	const branch = liveBranch(state);

	if (!branch) {
		return;
	}

	state.running = false;
	state.queuedDays = 0;
	state.playback = createPlayback(createKeyframe(branch.world), branch.world.day);
	seekTo(state, position);
}

export function leavePlayback(state: EngineState): void {
	const branch = liveBranch(state);

	state.playback = null;
	state.seeking = false;

	if (branch) {
		state.renderer?.attach(branch.world);
	}
}

export function carryOn(state: EngineState): void {
	const branch = liveBranch(state);
	const { playback } = state;

	if (!branch || !playback || state.seeking) {
		return;
	}

	const world = continueFrom(playback.world, branch.world, randomId());

	state.branches = [
		{
			label: "This town",
			world,
			keyframes: branch.keyframes.filter((keyframe) => keyframe.day <= world.day),
		},
	];
	state.activeBranch = 0;
	state.playback = null;
	state.lastSavedYear = Math.floor(world.day / YEAR_DAYS);
	state.pending.clear();
	state.renderer?.attach(world);
	state.post({ type: "autosave" });
}

export function stepPlayback(
	state: EngineState,
	active: Playback,
	elapsed: number,
	now: number,
): void {
	const branch = liveBranch(state);

	if (!branch) {
		return;
	}

	advancePosition(active, elapsed, branch.world.day);
	state.seeking = !catchUp(active, branch.world, now);
}
