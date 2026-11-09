import {
	describePerson,
	recentMoments,
	snapshotWorld,
	timelineMarks,
	type World,
} from "../library/index";
import { playbackState } from "./playback";
import type { PolisSeries } from "./protocol";
import { liveBranch, viewedWorld, type EngineState } from "./state";

const MAX_SERIES_POINTS = 300;
const MAX_MOMENTS = 14;
const LAST_HOUR = 23;
const HOURS_PER_DAY = 24;

function downsample(world: World): PolisSeries["points"] {
	const { history } = world;
	const stride = Math.max(1, Math.ceil(history.length / MAX_SERIES_POINTS));

	return history.filter((_, index) => index % stride === 0 || index === history.length - 1);
}

export function sendStatus(state: EngineState): void {
	const live = liveBranch(state)?.world;
	const world = viewedWorld(state);

	if (!live || !world) {
		return;
	}

	const playback = state.playback ? playbackState(state.playback, live.day, state.seeking) : null;

	state.post({
		type: "status",
		status: {
			snapshot: snapshotWorld(world),
			running: state.running,
			speedIndex: state.speedIndex,
			branch: state.activeBranch,
			branches: state.branches.map((branch) => branch.label),
			series: state.branches.map((branch) => ({
				label: branch.label,
				points: downsample(branch.world),
			})),
			decisions: state.stats,
			citizen: world.followed === -1 ? null : describePerson(world, world.followed, live.journal),
			daysPerSecond: state.daysPerSecond,
			playback,
			hour: Math.floor(state.dayFraction * HOURS_PER_DAY),
			marks: timelineMarks(live.log),
			moments: recentMoments(
				live.journal,
				playback?.day ?? live.day,
				playback?.hour ?? LAST_HOUR,
				MAX_MOMENTS,
			),
		},
	});
}
