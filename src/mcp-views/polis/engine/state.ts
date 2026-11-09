import type { PolisBucket, PolisRecording } from "../../../shared/polis";
import type { World } from "../library/index";
import { emptyDecisionStats } from "./decision-budget";
import type { Playback } from "./playback";
import type { PolisDecisionStats, PolisEvent, PolisModelSettings } from "./protocol";
import type { TownRenderer } from "./town-renderer";

export interface Branch {
	label: string;
	world: World;
	keyframes: World[];
}

export interface PendingDecision {
	branch: World;
	epoch: number;
	buckets: PolisBucket[];
}

export interface Restoring {
	branch: Branch;
	log: PolisRecording["log"];
	endDay: number;
	watch: boolean;
}

export interface EngineState {
	activeBranch: number;
	branches: Branch[];
	cooldownUntil: number;
	dayCarry: number;
	dayFraction: number;
	daysPerSecond: number;
	disposed: boolean;
	failedRounds: number;
	lastFlush: number;
	lastFrame: number;
	lastSavedYear: number;
	lastStatus: number;
	measuredDays: number;
	measuredSince: number;
	nextRequestId: number;
	pending: Map<number, PendingDecision>;
	playback: Playback | null;
	post: (event: PolisEvent) => void;
	queuedDays: number;
	renderer: TownRenderer | null;
	restoring: Restoring | null;
	running: boolean;
	seeking: boolean;
	settings: PolisModelSettings;
	speedIndex: number;
	stats: PolisDecisionStats;
}

export function createState(post: (event: PolisEvent) => void): EngineState {
	return {
		activeBranch: 0,
		branches: [],
		cooldownUntil: 0,
		dayCarry: 0,
		dayFraction: 0.5,
		daysPerSecond: 0,
		disposed: false,
		failedRounds: 0,
		lastFlush: 0,
		lastFrame: 0,
		lastSavedYear: 0,
		lastStatus: 0,
		measuredDays: 0,
		measuredSince: 0,
		nextRequestId: 1,
		pending: new Map(),
		playback: null,
		post,
		queuedDays: 0,
		renderer: null,
		restoring: null,
		running: false,
		seeking: false,
		settings: { callsPerYear: 1000, holdForAnswers: false },
		speedIndex: 1,
		stats: emptyDecisionStats(),
	};
}

export function liveBranch(state: EngineState): Branch | null {
	return state.branches[state.activeBranch] ?? null;
}

export function viewedWorld(state: EngineState): World | null {
	return state.playback?.world ?? liveBranch(state)?.world ?? null;
}
