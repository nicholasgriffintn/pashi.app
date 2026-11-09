import { randomId } from "../../shared/ids";
import {
	createKeyframe,
	createWorld,
	dispatch,
	follow,
	forkWorld,
	largestBuckets,
	lawLines,
	randomCitizen,
	type World,
} from "../library/index";
import { emptyDecisionStats } from "./decision-budget";
import { storeAnswers } from "./decision-flow";
import { nudgedPosition, positionFor } from "./playback";
import { carryOn, enterPlayback, leavePlayback, seekTo } from "./playback-control";
import type { PolisCommand } from "./protocol";
import { recordingOf } from "./recording-of";
import { restore } from "./restore";
import { liveBranch, viewedWorld, type EngineState } from "./state";
import { sendStatus } from "./status";
import { TownRenderer } from "./town-renderer";

const POLL_BUCKETS = 24;
const MORNING = 8;

function startWorld(state: EngineState, world: World): void {
	state.branches = [{ label: "This town", world, keyframes: [createKeyframe(world)] }];
	state.activeBranch = 0;
	state.dayCarry = 0;
	state.queuedDays = 0;
	state.playback = null;
	state.lastSavedYear = 0;
	state.stats = emptyDecisionStats();
	state.pending.clear();
	state.renderer?.attach(world);
	sendStatus(state);
}

function applyToViewed(state: EngineState, apply: (world: World) => void): void {
	const world = viewedWorld(state);

	if (world) {
		apply(world);
		sendStatus(state);
	}
}

function applyToLive(state: EngineState, apply: (world: World) => void): void {
	const world = liveBranch(state)?.world;

	if (world && !state.playback) {
		apply(world);
		sendStatus(state);
	}
}

function fork(state: EngineState): void {
	const branch = liveBranch(state);

	if (branch && state.branches.length === 1) {
		const world = forkWorld(branch.world);

		world.config = { ...world.config, id: randomId() };
		state.branches = [
			{ ...branch, label: "With your changes" },
			{ label: "As it was", world, keyframes: [...branch.keyframes] },
		];
		state.activeBranch = 0;
	}
}

function keepActiveBranch(state: EngineState): void {
	const branch = liveBranch(state);

	if (branch) {
		state.branches = [{ ...branch, label: "This town" }];
		state.activeBranch = 0;
	}
}

function switchBranch(state: EngineState, index: number): void {
	const branch = state.branches[index];

	if (branch) {
		state.activeBranch = index;
		state.renderer?.attach(branch.world);
	}
}

function attachCanvas(
	state: EngineState,
	command: Extract<PolisCommand, { type: "canvas" }>,
): void {
	const world = viewedWorld(state);

	state.renderer = new TownRenderer(command.canvas);
	state.renderer.resize(command.width, command.height, command.pixelRatio);

	if (world) {
		state.renderer.attach(world);
	}
}

function followAt(state: EngineState, world: World, x: number, y: number): void {
	const person = state.renderer?.personAt(x, y) ?? -1;

	if (person !== -1) {
		follow(world, person);
		state.renderer?.track();
	}
}

function followRandom(state: EngineState, world: World): void {
	const person = randomCitizen(world, Math.floor(performance.now() * 7919));

	follow(world, person);
	state.renderer?.track();
}

function handleViewCommand(state: EngineState, command: PolisCommand): boolean {
	switch (command.type) {
		case "canvas":
			attachCanvas(state, command);
			break;
		case "resize":
			state.renderer?.resize(command.width, command.height, command.pixelRatio);
			break;
		case "pan":
			state.renderer?.pan(command.dx, command.dy);
			break;
		case "zoom":
			state.renderer?.zoom(command.factor, command.x, command.y);
			break;
		case "mapMode":
			if (state.renderer) {
				state.renderer.mode = command.mode;
			}

			break;
		case "click":
			applyToViewed(state, (world) => followAt(state, world, command.x, command.y));
			break;
		case "follow":
			applyToViewed(state, (world) => follow(world, command.person));
			break;
		case "followRandom":
			applyToViewed(state, (world) => followRandom(state, world));
			break;
		case "focusFollowed":
			applyToViewed(state, (world) => {
				if (world.followed !== -1) {
					state.renderer?.track();
				}
			});
			break;
		default:
			return false;
	}

	return true;
}

function handlePlaybackCommand(state: EngineState, command: PolisCommand): boolean {
	const { playback } = state;

	switch (command.type) {
		case "watch":
			enterPlayback(state, positionFor(liveBranch(state)?.world.day ?? 0, MORNING));
			break;
		case "backToNow":
			leavePlayback(state);
			break;
		case "carryOn":
			carryOn(state);
			break;
		case "seek":
			if (playback) {
				playback.playing = false;
				seekTo(state, positionFor(command.day, command.hour ?? MORNING));
			}

			break;
		case "nudge":
			if (playback) {
				playback.playing = false;
				playback.unit = command.unit;
				seekTo(state, nudgedPosition(playback, command.unit, command.direction));
			}

			break;
		case "playback":
			if (playback) {
				playback.playing = command.playing;
				playback.unit = command.unit;
			}

			break;
		default:
			return false;
	}

	sendStatus(state);

	return true;
}

function handleRecordingCommand(state: EngineState, command: PolisCommand): boolean {
	switch (command.type) {
		case "import":
			restore(state, command.recording, command.watch);
			break;
		case "export": {
			const world = liveBranch(state)?.world;

			if (world) {
				state.post({ type: "recording", recording: recordingOf(world), purpose: command.purpose });
			}

			break;
		}

		default:
			return false;
	}

	return true;
}

function handleTownCommand(state: EngineState, command: PolisCommand): void {
	switch (command.type) {
		case "running":
			state.running = command.running;

			if (!command.running) {
				state.post({ type: "autosave" });
			}

			sendStatus(state);
			break;
		case "speed":
			state.speedIndex = command.index;
			state.running = true;
			sendStatus(state);
			break;
		case "step":
			if (liveBranch(state) && !state.playback) {
				state.queuedDays += command.days;
			}

			break;
		case "parameters":
			applyToLive(state, (world) =>
				dispatch(world, { type: "parameters", day: world.day, values: command.values }),
			);
			break;
		case "law":
			applyToLive(state, (world) =>
				dispatch(world, { type: "law", day: world.day, law: command.law }),
			);
			break;
		case "repeal":
			applyToLive(state, (world) =>
				dispatch(world, { type: "repeal", day: world.day, id: command.id }),
			);
			break;
		case "scenario":
			applyToLive(state, (world) =>
				dispatch(world, { type: "scenario", day: world.day, scenario: command.scenario }),
			);
			break;
		case "fork":
			fork(state);
			sendStatus(state);
			break;
		case "branch":
			switchBranch(state, command.index);
			sendStatus(state);
			break;
		case "keepBranch":
			keepActiveBranch(state);
			sendStatus(state);
			break;
		case "model":
			state.settings = command.settings;
			break;
		case "answers":
			storeAnswers(state, command);
			break;
		case "poll":
			applyToLive(state, (world) =>
				state.post({
					type: "pollBuckets",
					requestId: command.requestId,
					buckets: largestBuckets(world, POLL_BUCKETS),
					laws: lawLines(world),
				}),
			);
			break;
		default:
			break;
	}
}

export function handleCommand(state: EngineState, command: PolisCommand): void {
	if (command.type === "create") {
		startWorld(state, createWorld({ ...command, id: randomId() }));

		return;
	}

	if (
		!handleViewCommand(state, command) &&
		!handlePlaybackCommand(state, command) &&
		!handleRecordingCommand(state, command)
	) {
		handleTownCommand(state, command);
	}
}
