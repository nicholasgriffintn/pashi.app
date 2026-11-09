import { YEAR_DAYS, createKeyframe } from "../library/index";
import type { Branch } from "./state";

export const KEYFRAME_YEARS = 2;

const KEYFRAME_MEMORY_BYTES = 160_000_000;
const KEYFRAME_BYTES_PER_PERSON = 130;

function keyframeLimit(capacity: number): number {
	return Math.max(6, Math.floor(KEYFRAME_MEMORY_BYTES / (capacity * KEYFRAME_BYTES_PER_PERSON)));
}

export function captureKeyframe(branch: Branch): void {
	const { world, keyframes } = branch;

	if (world.day % (YEAR_DAYS * KEYFRAME_YEARS) !== 0) {
		return;
	}

	if (keyframes.some((keyframe) => keyframe.day === world.day)) {
		return;
	}

	keyframes.push(createKeyframe(world));

	if (keyframes.length > keyframeLimit(world.capacity)) {
		branch.keyframes = keyframes.filter((_, index) => index % 2 === 0);
	}
}
