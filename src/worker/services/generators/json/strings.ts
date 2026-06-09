import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import {
	bytesToBase64,
	parseBoolean,
	parseChoice,
	parseCount,
	parseInteger,
	randomBytes,
	randomCharacters,
	randomChoice,
	randomHex,
	randomIntegerBetween,
	singleOrList,
} from "../../../utils/generation";
import { LOREM_WORDS, TEXT_WORDS } from "../data/words";
import { textResult } from "./result";

type LetterCase = "lower" | "mixed" | "upper";
type StringType =
	| "alphanumeric"
	| "base64"
	| "binary"
	| "hex"
	| "letters"
	| "lorem"
	| "paragraphs"
	| "sentences"
	| "words";

const STRING_TYPES = [
	"alphanumeric",
	"letters",
	"words",
	"sentences",
	"paragraphs",
	"hex",
	"base64",
	"binary",
	"lorem",
] as const;
const LETTER_CASES = ["lower", "upper", "mixed"] as const;
const ALPHABETS = {
	binary: "01",
	lower: "abcdefghijklmnopqrstuvwxyz",
	numbers: "0123456789",
	upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
} as const;
const EMOJIS = [
	"⚡",
	"✨",
	"🌙",
	"🔥",
	"💿",
	"🧪",
	"🎲",
	"🎯",
	"🚀",
	"🛠️",
	"📦",
	"🔐",
	"🧠",
	"💾",
	"🪩",
	"🧩",
	"📡",
	"🎮",
	"🗡️",
	"🌀",
] as const;

export function createStringResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	switch (generator.id) {
		case "emoji":
			return textResult(generator, request.input, createEmojis(request));
		case "string":
			return textResult(generator, request.input, createStrings(request));
		default:
			return undefined;
	}
}

function createStrings(request: GeneratorRequest) {
	const type = parseChoice(request.fields.type, STRING_TYPES, "alphanumeric");
	const count = parseCount(request.fields.count ?? "", 1, 100);
	return singleOrList(Array.from({ length: count }, () => createStringValue(type, request)));
}

function createStringValue(type: StringType, request: GeneratorRequest) {
	switch (type) {
		case "alphanumeric":
			return randomCharacters(alphanumericAlphabet(request), parseInteger(request.fields.length ?? request.input, 32, 1, 1000));
		case "base64":
			return bytesToBase64(randomBytes(parseInteger(request.fields.byteCount ?? "", 32, 1, 256)));
		case "binary":
			return randomCharacters(ALPHABETS.binary, parseInteger(request.fields.length ?? request.input, 32, 1, 1000));
		case "hex":
			return randomHex(parseInteger(request.fields.length ?? request.input, 32, 1, 1000));
		case "letters":
			return randomCharacters(letterAlphabet(parseChoice(request.fields.case, LETTER_CASES, "mixed")), parseInteger(request.fields.length ?? request.input, 32, 1, 1000));
		case "lorem":
			return createParagraphs(LOREM_WORDS, parseInteger(request.fields.paragraphCount ?? "", 2, 1, 10), parseInteger(request.fields.sentenceCount ?? "", 3, 1, 20));
		case "paragraphs":
			return createParagraphs(TEXT_WORDS, parseInteger(request.fields.paragraphCount ?? "", 2, 1, 10), parseInteger(request.fields.sentenceCount ?? "", 3, 1, 20));
		case "sentences":
			return Array.from(
				{ length: parseInteger(request.fields.sentenceCount ?? "", 3, 1, 20) },
				() => createSentence(TEXT_WORDS),
			).join(" ");
		case "words":
			return Array.from(
				{ length: parseInteger(request.fields.wordCount ?? request.input, 5, 1, 100) },
				() => randomChoice(TEXT_WORDS),
			).join(" ");
	}
}

function createEmojis(request: GeneratorRequest) {
	const count = parseInteger(request.fields.count ?? request.input, 6, 1, 100);
	const separator = request.fields.separator ?? "";
	return Array.from({ length: count }, () => randomChoice(EMOJIS)).join(separator);
}

function alphanumericAlphabet(request: GeneratorRequest) {
	const uppercase = parseBoolean(request.fields.uppercase, true);
	const lowercase = parseBoolean(request.fields.lowercase, true);
	const numbers = parseBoolean(request.fields.numbers, true);
	const alphabet = [
		uppercase ? ALPHABETS.upper : "",
		lowercase ? ALPHABETS.lower : "",
		numbers ? ALPHABETS.numbers : "",
	].join("");

	return alphabet || `${ALPHABETS.upper}${ALPHABETS.lower}${ALPHABETS.numbers}`;
}

function letterAlphabet(letterCase: LetterCase) {
	switch (letterCase) {
		case "lower":
			return ALPHABETS.lower;
		case "upper":
			return ALPHABETS.upper;
		case "mixed":
			return `${ALPHABETS.upper}${ALPHABETS.lower}`;
	}
}

function createParagraphs(words: readonly string[], paragraphs: number, sentences: number) {
	return Array.from({ length: paragraphs }, () =>
		Array.from({ length: sentences }, () => createSentence(words)).join(" "),
	).join("\n\n");
}

function createSentence(words: readonly string[]) {
	const wordCount = randomIntegerBetween(8, 16);
	const sentence = Array.from({ length: wordCount }, () => randomChoice(words)).join(" ");
	return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}
