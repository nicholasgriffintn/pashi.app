import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import {
	parseDelimitedList,
	parseInteger,
	randomCharacters,
	randomChoice,
	randomIntegerInRange,
} from "../../../utils/generation";
import { fieldsResult, paletteResult, textResult } from "./result";

const STRING_ALPHABETS = {
	alphanumeric: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
	hex: "0123456789abcdef",
	letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
	numeric: "0123456789",
} as const;

const PASSPHRASE_WORDS = [
	"amber",
	"arcade",
	"binary",
	"cobalt",
	"drift",
	"ember",
	"flash",
	"glitch",
	"harbour",
	"ion",
	"jolt",
	"kite",
	"lunar",
	"matrix",
	"neon",
	"orbit",
	"pixel",
	"quartz",
	"ripple",
	"signal",
	"tunnel",
	"umbra",
	"vector",
	"wave",
	"xenon",
	"yield",
	"zenith",
] as const;

export function createRandomResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	switch (generator.id) {
		case "coinflip":
			return textResult(generator, request.input, randomChoice(["Heads", "Tails"]));
		case "colour":
			return paletteResult(generator, request.input, createColours(request));
		case "dice":
			return fieldsResult(generator, request.input, rollDice(request));
		case "number":
			return textResult(generator, request.input, `${randomInteger(request)}`);
		case "passphrase":
			return textResult(generator, request.input, createPassphrase(request));
		case "pick":
			return textResult(generator, request.input, pickListItem(request));
		case "pin":
			return textResult(generator, request.input, createPin(request));
		case "string":
			return textResult(generator, request.input, createString(request));
		default:
			return undefined;
	}
}

function randomInteger(request: GeneratorRequest) {
	const min = parseInteger(request.fields.min ?? "", 1, -1_000_000, 1_000_000);
	const max = parseInteger(request.fields.max ?? "", 100, -1_000_000, 1_000_000);
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	return lower + randomIntegerInRange(upper - lower + 1);
}

function createString(request: GeneratorRequest) {
	const length = parseInteger(request.fields.length ?? request.input, 16, 1, 512);
	const alphabetKey = request.fields.alphabet?.trim().toLowerCase();
	const alphabet =
		alphabetKey && alphabetKey in STRING_ALPHABETS
			? STRING_ALPHABETS[alphabetKey as keyof typeof STRING_ALPHABETS]
			: STRING_ALPHABETS.alphanumeric;

	return randomCharacters(alphabet, length);
}

function createPin(request: GeneratorRequest) {
	const length = parseInteger(request.fields.length ?? request.input, 6, 3, 16);
	return randomCharacters(STRING_ALPHABETS.numeric, length);
}

function createPassphrase(request: GeneratorRequest) {
	const words = parseInteger(request.fields.words ?? request.input, 4, 2, 12);
	const separator = request.fields.separator ?? "-";
	return Array.from({ length: words }, () => randomChoice(PASSPHRASE_WORDS)).join(separator);
}

function createColours(request: GeneratorRequest) {
	const count = parseInteger(request.fields.count ?? request.input, 1, 1, 12);
	return Array.from({ length: count }, () => `#${randomCharacters(STRING_ALPHABETS.hex, 6).toUpperCase()}`);
}

function rollDice(request: GeneratorRequest) {
	const dice = parseInteger(request.fields.dice ?? "", 2, 1, 100);
	const sides = parseInteger(request.fields.sides ?? "", 6, 2, 1000);
	const rolls = Array.from({ length: dice }, () => 1 + randomIntegerInRange(sides));
	return {
		dice: `${dice}`,
		rolls: rolls.join(", "),
		sides: `${sides}`,
		total: `${rolls.reduce((sum, roll) => sum + roll, 0)}`,
	};
}

function pickListItem(request: GeneratorRequest) {
	const items = parseDelimitedList(request.fields.items || request.input);
	if (items.length === 0) {
		throw new Error("Add at least one list item.");
	}

	return randomChoice(items);
}
