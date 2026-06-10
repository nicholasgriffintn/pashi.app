import type { GeneratorRequest } from "../request";
import { parseBoolean, parseChoice, parseInteger, randomIntegerInRange, singleOrList } from "../../../utils/generation";

interface DiceNotation {
	dice: number;
	dropHighest: number;
	dropLowest: number;
	keepHighest: number;
	modifier: number;
	sides: number;
}

const DICE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20", "d100", "custom"] as const;
const DICE_EXPRESSION_PATTERN = /^(.+?)\s*(>=|<=|>|<|=)\s*(-?\d+)\s*$/;

export function rollDice(request: GeneratorRequest) {
	const notation = parseDiceRequest(request);
	const rollCount = parseInteger(request.fields.count ?? request.fields.rolls ?? "", 1, 1, 25);
	const showIndividual = parseBoolean(request.fields.showIndividual ?? request.fields.show_individual, true);
	const rollSets = Array.from({ length: rollCount }, (_, index) =>
		formatRollRecord(rollDiceSet(notation), notation, index + 1, showIndividual),
	);

	return singleOrList(rollSets);
}

export function calculateDiceProbability(request: GeneratorRequest) {
	const expression = parseDiceExpression(diceNotationInput(request));
	const notation = parseDiceRequest(request);
	const target = expression
		? expression.target
		: parseInteger(request.fields.target ?? "", notation.dice + notation.modifier, -100_000, 100_000);
	const comparison = expression?.comparison ?? normaliseComparison(request.fields.comparison);
	const distribution = createDiceDistribution(notation);
	const totalOutcomes = sumBigInts([...distribution.values()]);
	const matchingOutcomes = sumBigInts(
		[...distribution.entries()]
			.filter(([total]) => matchesComparison(total, target, comparison))
			.map(([, outcomes]) => outcomes),
	);
	const probability = Number(matchingOutcomes) / Number(totalOutcomes);

	return {
		comparison,
		matchingOutcomes: `${matchingOutcomes}`,
		notation: formatDiceNotation(notation),
		percent: `${(probability * 100).toFixed(4)}%`,
		probability: probability.toFixed(8),
		target: `${target}`,
		totalOutcomes: `${totalOutcomes}`,
	};
}

function parseDiceNotation(value: string): DiceNotation {
	const normalised = value.trim().toLowerCase();
	const match = normalised.match(/^(\d*)d(\d+)([+-]\d+)?(?:\s+(drop|keep)\s+(lowest|highest)(?:\s+(\d+))?)?$/);
	if (!match) {
		return { dice: 1, dropHighest: 0, dropLowest: 0, keepHighest: 0, modifier: 0, sides: 6 };
	}
	const dice = parseInteger(match[1] || "1", 1, 1, 100);
	const mechanicCount = parseInteger(match[6] ?? "", 1, 1, dice);
	const mechanic = normaliseDiceMechanic(match[4], match[5], mechanicCount);

	return {
		dice,
		dropHighest: mechanic.dropHighest,
		dropLowest: mechanic.dropLowest,
		keepHighest: mechanic.keepHighest,
		modifier: parseInteger(match[3] ?? "", 0, -10_000, 10_000),
		sides: parseInteger(match[2], 6, 2, 1000),
	};
}

function parseDiceRequest(request: GeneratorRequest): DiceNotation {
	if (request.fields.dice_type || request.fields.diceType || request.fields.num_dice || request.fields.numDice) {
		return parseDiceFields(request);
	}

	return parseDiceNotation(parseDiceExpression(diceNotationInput(request))?.notation ?? diceNotationInput(request));
}

function diceNotationInput(request: GeneratorRequest) {
	return request.fields.notation || request.input || "1d6";
}

function parseDiceExpression(value: string) {
	const match = value.trim().match(DICE_EXPRESSION_PATTERN);
	if (!match) {
		return undefined;
	}

	return {
		comparison: normaliseComparison(match[2]),
		notation: match[1].trim(),
		target: parseInteger(match[3], 0, -100_000, 100_000),
	};
}

function parseDiceFields(request: GeneratorRequest): DiceNotation {
	const diceType = parseChoice(request.fields.dice_type ?? request.fields.diceType, DICE_TYPES, "d6");
	const sides = diceType === "custom"
		? parseInteger(request.fields.dice_sides ?? request.fields.diceSides ?? "", 6, 2, 1000)
		: Number.parseInt(diceType.slice(1), 10);
	const dice = parseInteger(request.fields.num_dice ?? request.fields.numDice ?? "", 1, 1, 100);
	const mechanic = normaliseFieldMechanics(request, dice);

	return {
		dice,
		dropHighest: mechanic.dropHighest,
		dropLowest: mechanic.dropLowest,
		keepHighest: mechanic.keepHighest,
		modifier: parseInteger(request.fields.modifier ?? "", 0, -100, 100),
		sides,
	};
}

function normaliseDiceMechanic(
	action: string | undefined,
	direction: string | undefined,
	count: number,
) {
	return {
		dropHighest: action === "drop" && direction === "highest" ? count : 0,
		dropLowest: action === "drop" && direction === "lowest" ? count : 0,
		keepHighest: action === "keep" && direction === "highest" ? count : 0,
	};
}

function normaliseFieldMechanics(request: GeneratorRequest, dice: number) {
	const dropLowest = parseInteger(request.fields.drop_lowest ?? request.fields.dropLowest ?? "", 0, 0, Math.min(10, dice - 1));
	const dropHighest = dropLowest > 0 ? 0 : parseInteger(request.fields.drop_highest ?? request.fields.dropHighest ?? "", 0, 0, Math.min(10, dice - 1));
	const keepHighest = dropLowest > 0 || dropHighest > 0 ? 0 : parseInteger(request.fields.keep_highest ?? request.fields.keepHighest ?? "", 0, 0, dice);

	return { dropHighest, dropLowest, keepHighest };
}

function rollDiceSet(notation: DiceNotation) {
	const rolls = Array.from({ length: notation.dice }, () => 1 + randomIntegerInRange(notation.sides));
	const { dropped, kept } = applyDiceMechanic(rolls, notation);
	const subtotal = kept.reduce((sum, roll) => sum + roll, 0);
	return {
		dropped,
		kept,
		rolls,
		subtotal,
		total: subtotal + notation.modifier,
	};
}

function formatRollRecord(
	roll: ReturnType<typeof rollDiceSet>,
	notation: DiceNotation,
	index: number,
	showIndividual: boolean,
) {
	return {
		...(roll.dropped.length > 0 ? { droppedRolls: roll.dropped.join(", ") } : {}),
		...(showIndividual ? { rolls: roll.rolls.join(", ") } : {}),
		...(roll.kept.length !== roll.rolls.length ? { keptRolls: roll.kept.join(", ") } : {}),
		diceType: `d${notation.sides}`,
		modifier: `${notation.modifier}`,
		notation: formatDiceNotation(notation),
		roll: `#${index}`,
		subtotal: `${roll.subtotal}`,
		total: `${roll.total}`,
	};
}

function applyDiceMechanic(rolls: number[], notation: DiceNotation) {
	const sorted = rolls.map((value, index) => ({ index, value }));
	if (notation.dropLowest > 0) {
		return splitRolls(rolls, sorted.toSorted((left, right) => left.value - right.value).slice(0, notation.dropLowest).map((roll) => roll.index));
	}
	if (notation.dropHighest > 0) {
		return splitRolls(rolls, sorted.toSorted((left, right) => right.value - left.value).slice(0, notation.dropHighest).map((roll) => roll.index));
	}
	if (notation.keepHighest > 0) {
		const keptIndexes = new Set(sorted.toSorted((left, right) => right.value - left.value).slice(0, notation.keepHighest).map((roll) => roll.index));
		return splitRolls(rolls, rolls.map((_, index) => index).filter((index) => !keptIndexes.has(index)));
	}

	return { dropped: [], kept: rolls };
}

function splitRolls(rolls: number[], droppedIndexes: number[]) {
	const droppedSet = new Set(droppedIndexes);
	return {
		dropped: rolls.filter((_, index) => droppedSet.has(index)),
		kept: rolls.filter((_, index) => !droppedSet.has(index)),
	};
}

function formatDiceNotation(notation: DiceNotation) {
	const modifier =
		notation.modifier === 0
			? ""
			: notation.modifier > 0
				? `+${notation.modifier}`
				: `${notation.modifier}`;
	const mechanic =
		notation.dropLowest > 0 ? ` drop ${notation.dropLowest} lowest`
		: notation.dropHighest > 0 ? ` drop ${notation.dropHighest} highest`
		: notation.keepHighest > 0 ? ` keep highest ${notation.keepHighest}`
		: "";
	return `${notation.dice}d${notation.sides}${modifier}${mechanic}`;
}

function createDiceDistribution(notation: DiceNotation) {
	if (hasDiceMechanic(notation)) {
		return createMechanicDistribution(notation);
	}

	if (notation.dice > 50 || notation.sides > 200 || notation.dice * notation.sides > 5000) {
		throw new Error("Exact dice probability supports up to 50 dice, 200 sides, or 5000 dice-side combinations.");
	}

	let distribution = new Map<number, bigint>([[0, 1n]]);
	for (let die = 0; die < notation.dice; die += 1) {
		const next = new Map<number, bigint>();
		for (const [sum, count] of distribution) {
			for (let face = 1; face <= notation.sides; face += 1) {
				addOutcome(next, sum + face, count);
			}
		}
		distribution = next;
	}

	return applyModifier(distribution, notation.modifier);
}

function createMechanicDistribution(notation: DiceNotation) {
	if (notation.dice > 8 || notation.sides > 30) {
		throw new Error("Advanced dice probability supports up to 8 dice with 30 sides.");
	}

	const distribution = new Map<number, bigint>();
	const rolls: number[] = [];

	function visit() {
		if (rolls.length === notation.dice) {
			const subtotal = applyDiceMechanic(rolls, notation).kept.reduce((sum, roll) => sum + roll, 0);
			addOutcome(distribution, subtotal + notation.modifier, 1n);
			return;
		}

		for (let face = 1; face <= notation.sides; face += 1) {
			rolls.push(face);
			visit();
			rolls.pop();
		}
	}

	visit();
	return distribution;
}

function hasDiceMechanic(notation: DiceNotation) {
	return notation.dropLowest > 0 || notation.dropHighest > 0 || notation.keepHighest > 0;
}

function applyModifier(distribution: Map<number, bigint>, modifier: number) {
	if (modifier === 0) {
		return distribution;
	}

	return new Map([...distribution.entries()].map(([sum, count]) => [sum + modifier, count]));
}

function addOutcome(distribution: Map<number, bigint>, total: number, count: bigint) {
	distribution.set(total, (distribution.get(total) ?? 0n) + count);
}

function normaliseComparison(value: string | undefined) {
	if (value === ">" || value === ">=" || value === "<" || value === "<=" || value === "=") {
		return value;
	}

	return ">=";
}

function matchesComparison(total: number, target: number, comparison: string) {
	switch (comparison) {
		case ">":
			return total > target;
		case "<":
			return total < target;
		case "<=":
			return total <= target;
		case "=":
			return total === target;
		default:
			return total >= target;
	}
}

function sumBigInts(values: bigint[]) {
	return values.reduce((sum, value) => sum + value, 0n);
}
