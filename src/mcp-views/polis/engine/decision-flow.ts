import {
	answersToEventPayload,
	dispatch,
	lawLines,
	releaseDecisionRequests,
	takeDecisionBuckets,
	type World,
} from "../library/index";
import { requestSize, strongestLeanings } from "./decision-budget";
import type { PolisCommand } from "./protocol";
import type { EngineState } from "./state";

const FLUSH_INTERVAL_MS = 2500;
const MAX_INFLIGHT = 1;
const COOLDOWN_BASE_MS = 8000;
const COOLDOWN_MAX_MS = 120_000;

function requestDecisions(state: EngineState, branch: World): void {
	const size = requestSize(state.settings, state.stats);

	if (size === 0 || state.pending.size >= MAX_INFLIGHT) {
		return;
	}

	const buckets = takeDecisionBuckets(branch, size);

	if (buckets.length === 0) {
		return;
	}

	const requestId = state.nextRequestId;

	state.nextRequestId += 1;
	state.stats = { ...state.stats, callsThisYear: state.stats.callsThisYear + buckets.length };
	state.pending.set(requestId, { branch, epoch: branch.decisions.epoch, buckets });
	state.post({ type: "decide", requestId, buckets, laws: lawLines(branch) });
}

export function flushDecisions(state: EngineState, now: number): void {
	if (
		now - state.lastFlush < FLUSH_INTERVAL_MS ||
		now < state.cooldownUntil ||
		state.settings.callsPerYear === 0
	) {
		return;
	}

	state.lastFlush = now;

	for (const { world } of state.branches) {
		requestDecisions(state, world);
	}
}

export function holdingForAnswers(state: EngineState, world: World): boolean {
	return (
		state.settings.holdForAnswers &&
		state.settings.callsPerYear > state.stats.callsThisYear &&
		(state.pending.size > 0 || world.decisions.demand.size > 0)
	);
}

export function storeAnswers(
	state: EngineState,
	command: Extract<PolisCommand, { type: "answers" }>,
): void {
	const request = state.pending.get(command.requestId);

	state.pending.delete(command.requestId);

	if (!request) {
		return;
	}

	const { branch, epoch, buckets } = request;

	dispatch(branch, {
		type: "answers",
		day: branch.day,
		epoch,
		answers: answersToEventPayload(command.answers),
	});
	releaseDecisionRequests(branch, command.failedKeys);

	const recent = strongestLeanings(buckets, command.answers);

	state.failedRounds = command.answers.length === 0 ? state.failedRounds + 1 : 0;

	if (state.failedRounds > 0) {
		state.cooldownUntil =
			performance.now() +
			Math.min(COOLDOWN_MAX_MS, COOLDOWN_BASE_MS * 2 ** (state.failedRounds - 1));
	}

	state.stats = {
		...state.stats,
		callsThisYear: Math.max(0, state.stats.callsThisYear - command.failedKeys.length),
		calls: state.stats.calls + command.answers.length,
		tokens: state.stats.tokens + command.tokens,
		model: command.model ?? state.stats.model,
		error: state.failedRounds > 0 ? (command.error ?? "The model did not answer") : null,
		recent: recent.length > 0 ? recent : state.stats.recent,
	};
}
