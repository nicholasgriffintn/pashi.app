import { BudgetExceededError } from "./budget.ts";
import {
	charSet,
	fullSet,
	intersection,
	isEmpty,
	overlaps,
	union,
	type CharSet,
} from "./regex-charset.ts";
import {
	parseRegexPattern,
	type GroupNode,
	type Quantifier,
	type RegexNode,
} from "./regex-pattern.ts";

const COUNTED_REPETITION_LIMIT = 100;
const MAX_CAPTURE_LENGTH = 3400;

const EXPENSIVE_STEP_COST = 100;
const EXPENSIVE_STEP_SYNTAX = /\\[pP]\{/;
const STRING_PROPERTY_STEP_COST = 1000;
const STRING_PROPERTY_SYNTAX = /\\p\{(?:RGI_|Basic_Emoji|Emoji_Keycap_Sequence)|\\q\{/;
const STEP_BUDGET = 100_000_000;
const INTERPRETED_SUBJECT_LENGTH = 1000;
const INTERPRETER_STEP_COST = 10;
const WAYS_CEILING = 1e15;

interface Traits {
	alternation: boolean;
	backreference: boolean;
	counted: boolean;
	unbounded: boolean;
	variable: boolean;
}

interface ChainItem {
	choices: number;
	length: number;
	nullable: boolean;
	set: CharSet;
	weight: number;
}

interface Chain {
	items: ChainItem[];
	lookaroundDegree: number;
	optionalEnds: Map<number, number[]>;
	ways: number;
}

interface LeadingSet {
	isOpen: boolean;
	set: CharSet;
}

interface SequenceCost extends RegexCost {
	leading: LeadingSet;
}

export interface RegexCost {
	degree: number;
	span: number;
	ways: number;
}

export function assessRegexCost(pattern: string, flags: string): RegexCost | undefined {
	const alternatives = parseRegexPattern(pattern, flags);

	if (!alternatives) {
		return undefined;
	}

	const traits = inspectAlternatives(alternatives);

	if (traits.backreference && traits.unbounded) {
		throw unsafePattern("a backreference is combined with an unbounded quantifier");
	}

	const cost = combineAlternativeCosts(alternatives, true);

	return { ...cost, ways: scale(cost.ways, stepCost(pattern, flags)) };
}

function stepCost(pattern: string, flags: string) {
	if (flags.includes("v") && STRING_PROPERTY_SYNTAX.test(pattern)) {
		return STRING_PROPERTY_STEP_COST;
	}

	return flags.includes("v") || EXPENSIVE_STEP_SYNTAX.test(pattern) ? EXPENSIVE_STEP_COST : 1;
}

export function safeRegexTextLength(cost: RegexCost) {
	const interpretedLimit = textLengthWithin(STEP_BUDGET / INTERPRETER_STEP_COST, cost);

	return interpretedLimit < INTERPRETED_SUBJECT_LENGTH - 1
		? interpretedLimit
		: textLengthWithin(STEP_BUDGET, cost);
}

function textLengthWithin(budget: number, cost: RegexCost) {
	return Math.floor((budget / scale(cost.ways, cost.span)) ** (1 / (cost.degree + 1)) + 1e-9);
}

export function unsafePattern(reason: string) {
	return new BudgetExceededError(
		`This pattern is too complex to run safely: ${reason}. The check is conservative, so some safe patterns are rejected too.`,
	);
}

function inspectAlternatives(alternatives: RegexNode[][]): Traits {
	const traits: Traits = {
		alternation: alternatives.length > 1,
		backreference: false,
		counted: false,
		unbounded: false,
		variable: false,
	};

	for (const node of alternatives.flat()) {
		const found = inspectNode(node);

		traits.alternation ||= found.alternation;
		traits.backreference ||= found.backreference;
		traits.counted ||= found.counted;
		traits.unbounded ||= found.unbounded;
		traits.variable ||= found.variable;
	}

	return traits;
}

function inspectNode(node: RegexNode): Traits {
	const traits = inspectAlternatives(node.kind === "group" ? node.alternatives : []);
	const { quantifier } = node;

	traits.backreference ||= node.kind === "backreference";

	if (!quantifier) {
		return traits;
	}

	const isUnbounded = quantifier.max === Infinity;
	const largest = isUnbounded ? quantifier.min : quantifier.max;

	if (quantifier.counted && largest > COUNTED_REPETITION_LIMIT) {
		throw unsafePattern(`a counted repetition goes above ${COUNTED_REPETITION_LIMIT}`);
	}

	if (node.kind === "group" && quantifier.max > 1) {
		assertSafeRepeatedGroup(traits, quantifier);
	}

	traits.counted ||= quantifier.counted;
	traits.unbounded ||= isUnbounded;
	traits.variable ||= quantifier.min !== quantifier.max;

	return traits;
}

function assertSafeRepeatedGroup(body: Traits, quantifier: Quantifier) {
	if (body.unbounded) {
		throw unsafePattern("a repeated group contains an unbounded quantifier");
	}

	if (quantifier.counted && body.counted) {
		throw unsafePattern("counted repetitions are nested");
	}

	if (quantifier.max !== Infinity) {
		return;
	}

	if (body.alternation) {
		throw unsafePattern("an unbounded group contains alternation");
	}

	if (body.variable) {
		throw unsafePattern("an unbounded group contains an optional or variable-length part");
	}
}

function combineAlternativeCosts(alternatives: RegexNode[][], isTopLevel = false): RegexCost {
	const costs = alternatives.map((nodes) => sequenceCost(nodes, isTopLevel));
	const isDeterministic = costs.every(
		(cost, index) =>
			!cost.leading.isOpen &&
			costs.slice(index + 1).every((other) => !overlaps(cost.leading.set, other.leading.set)),
	);
	const ways = costs.map((cost) => cost.ways);

	return {
		degree: Math.max(...costs.map((cost) => cost.degree)),
		span: Math.max(...costs.map((cost) => cost.span)),
		ways: isDeterministic
			? Math.max(...ways)
			: ways.reduce((total, count) => scale(1, total + count), 0),
	};
}

function sequenceCost(nodes: RegexNode[], isTopLevel: boolean): SequenceCost {
	const chain: Chain = { items: [], lookaroundDegree: 0, optionalEnds: new Map(), ways: 1 };

	collectChain(nodes, chain);

	const isOptional = optionalFlags(chain);

	return {
		degree: chainDegree(chain) + chain.lookaroundDegree,
		leading: leadingSet(chain.items, isOptional, 0),
		span: chainSpan(chain.items, isOptional),
		ways: scale(chain.ways, choiceWays(chain, isOptional, isTopLevel)),
	};
}

function chainSpan(items: readonly ChainItem[], isOptional: readonly boolean[]) {
	const rescans = items.flatMap((item, index) =>
		item.weight > 0 ? [rescanSpan(items, isOptional, index)] : [],
	);

	if (rescans.length > 0) {
		return Math.max(...rescans);
	}

	return items.reduce((total, item) => scale(1, total + item.length), 1);
}

function rescanSpan(items: readonly ChainItem[], isOptional: readonly boolean[], from: number) {
	let span = 1 + items[from].length;

	for (let index = from + 1; index < items.length; index += 1) {
		if (overlaps(items[index].set, items[from].set)) {
			span = scale(1, span + items[index].length);
		} else if (!items[index].nullable && !isOptional[index]) {
			break;
		}
	}

	return span;
}

function optionalFlags(chain: Chain) {
	const isOptional = chain.items.map(() => false);

	for (const [start, ends] of chain.optionalEnds) {
		isOptional.fill(true, start, Math.max(...ends));
	}

	return isOptional;
}

function leadingSet(items: readonly ChainItem[], isOptional: readonly boolean[], from: number) {
	const leading: LeadingSet = { isOpen: true, set: charSet(() => false) };

	for (let index = from; index < items.length && leading.isOpen; index += 1) {
		leading.set = union(leading.set, items[index].set);
		leading.isOpen = items[index].nullable || isOptional[index];
	}

	return leading;
}

function collectChain(nodes: RegexNode[], chain: Chain) {
	for (const node of nodes) {
		const min = node.quantifier?.min ?? 1;
		const max = node.quantifier?.max ?? 1;
		const isUnbounded = max === Infinity;

		if (node.kind === "set") {
			chain.items.push({
				choices: isUnbounded ? 1 : max - min + 1,
				length: isUnbounded ? 0 : max,
				nullable: min === 0,
				set: node.set,
				weight: isUnbounded ? 1 : 0,
			});
		} else if (node.kind === "backreference") {
			chain.items.push({
				choices: isUnbounded ? 1 : max - min + 1,
				length: isUnbounded ? MAX_CAPTURE_LENGTH : scale(MAX_CAPTURE_LENGTH, max),
				nullable: true,
				set: fullSet(),
				weight: 0,
			});
		} else if (node.kind === "group") {
			collectGroup(node, min, max, chain);
		}
	}
}

function collectGroup(node: GroupNode, min: number, max: number, chain: Chain) {
	if (!node.lookaround && node.alternatives.length === 1 && max <= 1) {
		const start = chain.items.length;

		collectChain(node.alternatives[0], chain);

		if (min === 0) {
			chain.optionalEnds.set(start, [...(chain.optionalEnds.get(start) ?? []), chain.items.length]);
		}

		return;
	}

	const body = combineAlternativeCosts(node.alternatives);
	const length = max === Infinity ? body.span : scale(body.span, Math.max(1, max));

	chain.ways = scale(chain.ways, repeatedWays(body.ways, min, max));

	if (node.lookaround) {
		chain.lookaroundDegree = Math.max(chain.lookaroundDegree, body.degree);
		chain.items.push({ choices: 1, length, nullable: true, set: fullSet(), weight: 0 });

		return;
	}

	chain.items.push({
		choices: 1,
		length,
		nullable: isNullable(node),
		set: reachOf(node.alternatives),
		weight: max === Infinity ? Math.max(1, body.degree) : body.degree,
	});
}

function repeatedWays(ways: number, min: number, max: number) {
	if (max === Infinity) {
		return ways;
	}

	if (max > 1) {
		return scale(max - min + 1, ways ** max);
	}

	return min === max ? ways : scale(ways, 2);
}

function scale(left: number, right: number) {
	return Math.min(WAYS_CEILING, left * right);
}

function reachOf(alternatives: RegexNode[][]): CharSet {
	let reach = charSet(() => false);

	for (const node of alternatives.flat()) {
		if (node.kind === "set") {
			reach = union(reach, node.set);
		} else if (node.kind === "group") {
			reach = union(reach, reachOf(node.alternatives));
		} else if (node.kind === "backreference") {
			return fullSet();
		}
	}

	return reach;
}

function isNullable(node: RegexNode): boolean {
	if (node.quantifier?.min === 0) {
		return true;
	}

	if (node.kind === "group") {
		return node.lookaround || node.alternatives.some((nodes) => nodes.every(isNullable));
	}

	return node.kind !== "set";
}

function choiceWays(chain: Chain, isOptional: readonly boolean[], isTopLevel: boolean) {
	const { items } = chain;
	let ways = 1;

	const competesWithWhatFollows = (set: CharSet, from: number) => {
		const follow = leadingSet(items, isOptional, from);

		return overlaps(set, follow.set) || (follow.isOpen && !isTopLevel);
	};

	items.forEach((item, index) => {
		if (item.choices > 1 && competesWithWhatFollows(item.set, index + 1)) {
			ways = scale(ways, item.choices);
		}
	});

	for (const [start, ends] of chain.optionalEnds) {
		for (const end of ends) {
			const reach = items.slice(start, end).reduce(
				(set, item) => union(set, item.set),
				charSet(() => false),
			);

			if (competesWithWhatFollows(reach, end)) {
				ways = scale(ways, 2);
			}
		}
	}

	return ways;
}

function chainDegree(chain: Chain) {
	const { items } = chain;
	const best: number[] = [];
	let degree = 0;

	for (let later = 0; later < items.length; later += 1) {
		let longest = 0;

		for (let earlier = 0; earlier < later && items[later].weight > 0; earlier += 1) {
			const link = items[earlier].weight > 0 ? linkBetween(chain, earlier, later) : "none";

			if (link === "adjacent") {
				throw unsafePattern("adjacent unbounded quantifiers can match the same characters");
			}

			if (link === "connected") {
				longest = Math.max(longest, best[earlier]);
			}
		}

		best[later] = items[later].weight > 0 ? longest + items[later].weight : 0;
		degree = Math.max(degree, best[later]);
	}

	return degree;
}

function linkBetween(chain: Chain, earlier: number, later: number) {
	const { items } = chain;
	const shared = intersection(items[earlier].set, items[later].set);

	if (isEmpty(shared)) {
		return "none";
	}

	let isAdjacent = true;
	let index = earlier + 1;

	while (index < later) {
		const skipTo = Math.max(
			-1,
			...(chain.optionalEnds.get(index) ?? []).filter((end) => end <= later),
		);

		if (skipTo > index) {
			index = skipTo;

			continue;
		}

		if (!items[index].nullable) {
			if (!overlaps(items[index].set, shared)) {
				return "none";
			}

			isAdjacent = false;
		}

		index += 1;
	}

	return isAdjacent ? "adjacent" : "connected";
}
