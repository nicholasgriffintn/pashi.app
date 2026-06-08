import type { GeneratorRequest } from "../request";
import { parseInteger, randomIntegerInRange } from "../../../utils/generation";

interface DiceNotation {
	dice: number;
	dropLowest: boolean;
	modifier: number;
	sides: number;
}

export function rollDice(request: GeneratorRequest) {
	const notation = parseDiceNotation(request.fields.notation || request.input || "1d6");
	const rollCount = parseInteger(request.fields.rolls ?? "", 1, 1, 100);
	const rollSets = Array.from({ length: rollCount }, () => rollDiceSet(notation));
	const totals = rollSets.map((roll) => roll.total);

	return {
		highest: `${Math.max(...totals)}`,
		lowest: `${Math.min(...totals)}`,
		notation: formatDiceNotation(notation),
		rolls: rollSets
			.map((roll, index) => `#${index + 1}: ${roll.rolls.join(", ")} => ${roll.total}`)
			.join("\n"),
		total: `${totals.reduce((sum, total) => sum + total, 0)}`,
	};
}

export function calculateDiceProbability(request: GeneratorRequest) {
	const notation = parseDiceNotation(request.fields.notation || request.input || "1d6");
	const target = parseInteger(request.fields.target ?? "", notation.dice + notation.modifier, -100_000, 100_000);
	const comparison = normaliseComparison(request.fields.comparison);
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
	const match = normalised.match(/^(\d*)d(\d+)([+-]\d+)?(?:\s+drop\s+lowest)?$/);
	if (!match) {
		return { dice: 1, dropLowest: false, modifier: 0, sides: 6 };
	}

	return {
		dice: parseInteger(match[1] || "1", 1, 1, 100),
		dropLowest: normalised.includes("drop lowest"),
		modifier: parseInteger(match[3] ?? "", 0, -10_000, 10_000),
		sides: parseInteger(match[2], 6, 2, 1000),
	};
}

function rollDiceSet(notation: DiceNotation) {
	const rolls = Array.from({ length: notation.dice }, () => 1 + randomIntegerInRange(notation.sides));
	const kept = notation.dropLowest && rolls.length > 1 ? dropLowestRoll(rolls) : rolls;
	const subtotal = kept.reduce((sum, roll) => sum + roll, 0);
	return {
		rolls,
		total: subtotal + notation.modifier,
	};
}

function dropLowestRoll(rolls: number[]) {
	const lowestIndex = rolls.indexOf(Math.min(...rolls));
	return rolls.filter((_, index) => index !== lowestIndex);
}

function formatDiceNotation(notation: DiceNotation) {
	const modifier =
		notation.modifier === 0
			? ""
			: notation.modifier > 0
				? `+${notation.modifier}`
				: `${notation.modifier}`;
	return `${notation.dice}d${notation.sides}${modifier}${notation.dropLowest ? " drop lowest" : ""}`;
}

function createDiceDistribution(notation: DiceNotation) {
	if (notation.dropLowest) {
		return createDropLowestDistribution(notation);
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

function createDropLowestDistribution(notation: DiceNotation) {
	if (notation.dice > 8 || notation.sides > 30) {
		throw new Error("Drop-lowest probability supports up to 8 dice with 30 sides.");
	}

	const distribution = new Map<number, bigint>();
	const rolls: number[] = [];

	function visit() {
		if (rolls.length === notation.dice) {
			const subtotal = dropLowestRoll(rolls).reduce((sum, roll) => sum + roll, 0);
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
