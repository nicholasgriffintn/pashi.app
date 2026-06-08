import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import {
	parseCount,
	parseInteger,
	randomCharacters,
	randomChoice,
	singleOrList,
} from "../../../utils/generation";
import { rollDice } from "./dice";
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
			return textResult(generator, request.input, createCoinFlips(request));
		case "colour":
			return paletteResult(generator, request.input, createColours(request));
		case "dice":
			return fieldsResult(generator, request.input, rollDice(request));
		case "passphrase":
			return textResult(generator, request.input, createPassphrase(request));
		case "pin":
			return textResult(generator, request.input, createPin(request));
		case "string":
			return textResult(generator, request.input, createString(request));
		default:
			return undefined;
	}
}

function createString(request: GeneratorRequest) {
	const length = parseInteger(request.fields.length ?? request.input, 16, 1, 512);
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	const alphabetKey = request.fields.alphabet?.trim().toLowerCase();
	const alphabet =
		alphabetKey && alphabetKey in STRING_ALPHABETS
			? STRING_ALPHABETS[alphabetKey as keyof typeof STRING_ALPHABETS]
			: STRING_ALPHABETS.alphanumeric;

	return singleOrList(Array.from({ length: count }, () => randomCharacters(alphabet, length)));
}

function createPin(request: GeneratorRequest) {
	const length = parseInteger(request.fields.length ?? request.input, 6, 3, 16);
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => randomCharacters(STRING_ALPHABETS.numeric, length)));
}

function createPassphrase(request: GeneratorRequest) {
	const words = parseInteger(request.fields.words ?? request.input, 4, 2, 12);
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	const separator = request.fields.separator ?? "-";
	return singleOrList(
		Array.from({ length: count }, () =>
			Array.from({ length: words }, () => randomChoice(PASSPHRASE_WORDS)).join(separator),
		),
	);
}

function createColours(request: GeneratorRequest) {
	const count = parseInteger(request.fields.count ?? request.input, 1, 1, 12);
	return Array.from({ length: count }, () => `#${randomCharacters(STRING_ALPHABETS.hex, 6).toUpperCase()}`);
}

function createCoinFlips(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => randomChoice(["Heads", "Tails"])));
}
