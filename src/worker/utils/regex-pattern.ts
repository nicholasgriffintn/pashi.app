import {
	COVERAGE_ALL,
	COVERAGE_NONE,
	COVERAGE_SOME,
	charSet,
	complement,
	foldCase,
	fullSet,
	isAsciiSpace,
	isDigit,
	isHexDigit,
	isLetter,
	isWord,
	rangeSet,
	union,
	type CharSet,
} from "./regex-charset.ts";

const GROUP_DEPTH_LIMIT = 20;

export interface Quantifier {
	counted: boolean;
	max: number;
	min: number;
}

interface SetNode {
	kind: "set";
	quantifier?: Quantifier;
	set: CharSet;
}

export interface GroupNode {
	alternatives: RegexNode[][];
	kind: "group";
	lookaround: boolean;
	quantifier?: Quantifier;
}

interface MarkerNode {
	kind: "assertion" | "backreference";
	quantifier?: Quantifier;
}

export type RegexNode = GroupNode | MarkerNode | SetNode;

interface ParserState {
	dotAll: boolean;
	ignoreCase: boolean;
	index: number;
	pattern: string;
	unicode: boolean;
	unicodeSets: boolean;
}

class PatternSyntaxSignal extends Error {}

export function parseRegexPattern(pattern: string, flags: string): RegexNode[][] | undefined {
	const state: ParserState = {
		dotAll: flags.includes("s"),
		ignoreCase: flags.includes("i"),
		index: 0,
		pattern,
		unicode: flags.includes("u") || flags.includes("v"),
		unicodeSets: flags.includes("v"),
	};

	try {
		const alternatives = readAlternatives(state, 0);

		return state.index < state.pattern.length ? undefined : alternatives;
	} catch (error) {
		if (error instanceof PatternSyntaxSignal) {
			return undefined;
		}

		throw error;
	}
}

function readAlternatives(state: ParserState, depth: number): RegexNode[][] {
	const alternatives: RegexNode[][] = [[]];

	while (state.index < state.pattern.length && state.pattern[state.index] !== ")") {
		if (state.pattern[state.index] === "|") {
			alternatives.push([]);
			state.index += 1;

			continue;
		}

		const node = readAtom(state, depth);

		node.quantifier = readQuantifier(state);
		alternatives[alternatives.length - 1].push(node);
	}

	return alternatives;
}

function readAtom(state: ParserState, depth: number): RegexNode {
	const char = state.pattern[state.index];

	state.index += 1;

	switch (char) {
		case "(":
			return readGroup(state, depth);
		case "[":
			return { kind: "set", set: readClass(state) };
		case ".":
			return { kind: "set", set: dotSet(state) };
		case "^":
		case "$":
			return { kind: "assertion" };
		case "\\":
			return readEscapedAtom(state);
		case "*":
		case "+":
		case "?":
			throw new PatternSyntaxSignal();
		default:
			return { kind: "set", set: literalSet(char.charCodeAt(0), state) };
	}
}

function readEscapedAtom(state: ParserState): RegexNode {
	const char = state.pattern[state.index];

	if (char === "b" || char === "B") {
		state.index += 1;

		return { kind: "assertion" };
	}

	if (char >= "1" && char <= "9") {
		while (isDigit(state.pattern.charCodeAt(state.index))) {
			state.index += 1;
		}

		return { kind: "backreference" };
	}

	if (char === "k" && state.pattern[state.index + 1] === "<") {
		const close = state.pattern.indexOf(">", state.index);

		if (close === -1) {
			throw new PatternSyntaxSignal();
		}

		state.index = close + 1;

		return { kind: "backreference" };
	}

	const escape = readEscape(state);

	return { kind: "set", set: typeof escape === "number" ? literalSet(escape, state) : escape };
}

function readGroup(state: ParserState, depth: number): GroupNode {
	if (depth >= GROUP_DEPTH_LIMIT) {
		throw new PatternSyntaxSignal();
	}

	const lookaround = readGroupPrefix(state);
	const alternatives = readAlternatives(state, depth + 1);

	if (state.pattern[state.index] !== ")") {
		throw new PatternSyntaxSignal();
	}

	state.index += 1;

	return { alternatives, kind: "group", lookaround };
}

function readGroupPrefix(state: ParserState) {
	const { pattern } = state;

	if (pattern[state.index] !== "?") {
		return false;
	}

	const marker = pattern[state.index + 1];
	const next = pattern[state.index + 2];

	if (marker === ":") {
		state.index += 2;

		return false;
	}

	if (marker === "=" || marker === "!") {
		state.index += 2;

		return true;
	}

	if (marker === "<" && (next === "=" || next === "!")) {
		state.index += 3;

		return true;
	}

	const close = pattern.indexOf(marker === "<" ? ">" : ":", state.index);

	if (close === -1) {
		throw new PatternSyntaxSignal();
	}

	if (marker !== "<") {
		applyModifiers(state, pattern.slice(state.index + 1, close));
	}

	state.index = close + 1;

	return false;
}

function applyModifiers(state: ParserState, modifiers: string) {
	for (const modifier of modifiers) {
		if (!"ims-".includes(modifier)) {
			throw new PatternSyntaxSignal();
		}
	}

	const enabled = modifiers.split("-")[0];

	state.ignoreCase ||= enabled.includes("i");
	state.dotAll ||= enabled.includes("s");
}

function readQuantifier(state: ParserState): Quantifier | undefined {
	const char = state.pattern[state.index];
	let quantifier: Quantifier | undefined;

	if (char === "*" || char === "+" || char === "?") {
		quantifier = {
			counted: false,
			max: char === "?" ? 1 : Infinity,
			min: char === "+" ? 1 : 0,
		};
		state.index += 1;
	} else if (char === "{") {
		quantifier = readCountedQuantifier(state);
	}

	if (quantifier && state.pattern[state.index] === "?") {
		state.index += 1;
	}

	return quantifier;
}

function readCountedQuantifier(state: ParserState): Quantifier | undefined {
	const { pattern } = state;
	let cursor = state.index + 1;

	const readNumber = () => {
		const start = cursor;

		while (isDigit(pattern.charCodeAt(cursor))) {
			cursor += 1;
		}

		return cursor === start ? undefined : Number(pattern.slice(start, cursor));
	};

	const min = readNumber();

	if (min === undefined) {
		return undefined;
	}

	let max = min;

	if (pattern[cursor] === ",") {
		cursor += 1;
		max = readNumber() ?? Infinity;
	}

	if (pattern[cursor] !== "}") {
		return undefined;
	}

	state.index = cursor + 1;

	return { counted: true, max, min };
}

function readEscape(state: ParserState): CharSet | number {
	const char = state.pattern[state.index];

	if (char === undefined) {
		throw new PatternSyntaxSignal();
	}

	state.index += 1;

	switch (char) {
		case "d":
			return charSet(isDigit);
		case "D":
			return complement(charSet(isDigit));
		case "w":
			return wordSet(state);
		case "W":
			return complement(wordSet(state));
		case "s":
			return charSet(isAsciiSpace, COVERAGE_ALL);
		case "S":
			return complement(charSet(isAsciiSpace, COVERAGE_ALL));
		case "n":
			return 10;
		case "r":
			return 13;
		case "t":
			return 9;
		case "f":
			return 12;
		case "v":
			return 11;
		case "0":
			return readOctalEscape(state);
		case "c":
			return readControlEscape(state);
		case "x":
			return readHexEscape(state, 2);
		case "u":
			return readUnicodeEscape(state);
		case "p":
		case "P":
			return readPropertyEscape(state, char);
		default:
			return char >= "1" && char <= "9" ? fullSet() : char.charCodeAt(0);
	}
}

function readOctalEscape(state: ParserState) {
	let end = state.index;

	while (end < state.index + 2 && isOctalDigit(state.pattern.charCodeAt(end))) {
		end += 1;
	}

	const code = Number.parseInt(`0${state.pattern.slice(state.index, end)}`, 8);

	state.index = end;

	return code;
}

function isOctalDigit(code: number) {
	return code >= 48 && code <= 55;
}

function readControlEscape(state: ParserState) {
	const code = state.pattern.charCodeAt(state.index);

	if (!isLetter(code)) {
		return fullSet();
	}

	state.index += 1;

	return code % 32;
}

function readHexEscape(state: ParserState, length: number) {
	const end = state.index + length;

	for (let index = state.index; index < end; index += 1) {
		if (!isHexDigit(state.pattern.charCodeAt(index))) {
			return fullSet();
		}
	}

	const code = Number.parseInt(state.pattern.slice(state.index, end), 16);

	state.index = end;

	return code;
}

function readUnicodeEscape(state: ParserState) {
	if (state.pattern[state.index] !== "{" || !state.unicode) {
		return readHexEscape(state, 4);
	}

	const close = state.pattern.indexOf("}", state.index);

	if (close === -1) {
		throw new PatternSyntaxSignal();
	}

	state.index = close + 1;

	return fullSet();
}

function readPropertyEscape(state: ParserState, char: string) {
	if (!state.unicode) {
		return char.charCodeAt(0);
	}

	const close = state.pattern[state.index] === "{" ? state.pattern.indexOf("}", state.index) : -1;

	if (close === -1) {
		throw new PatternSyntaxSignal();
	}

	state.index = close + 1;

	return fullSet();
}

function readClass(state: ParserState): CharSet {
	if (state.unicodeSets) {
		return skipSetNotationClass(state);
	}

	const negated = state.pattern[state.index] === "^";
	let members = charSet(() => false);

	if (negated) {
		state.index += 1;
	}

	while (state.pattern[state.index] !== "]") {
		const from = readClassAtom(state);
		const isRange =
			state.pattern[state.index] === "-" &&
			state.index + 1 < state.pattern.length &&
			state.pattern[state.index + 1] !== "]";

		if (!isRange) {
			members = union(members, typeof from === "number" ? rangeSet(from, from) : from);

			continue;
		}

		state.index += 1;

		const to = readClassAtom(state);

		members =
			typeof from === "number" && typeof to === "number"
				? union(members, rangeSet(from, to))
				: fullSet();
	}

	state.index += 1;

	const folded = state.ignoreCase ? foldCase(members, state.unicode) : members;

	return negated ? complement(folded) : folded;
}

function readClassAtom(state: ParserState): CharSet | number {
	const char = state.pattern[state.index];

	if (char === undefined) {
		throw new PatternSyntaxSignal();
	}

	state.index += 1;

	if (char !== "\\") {
		return char.charCodeAt(0);
	}

	if (state.pattern[state.index] === "b") {
		state.index += 1;

		return 8;
	}

	return readEscape(state);
}

function skipSetNotationClass(state: ParserState): CharSet {
	let depth = 1;

	while (depth > 0) {
		const char = state.pattern[state.index];

		if (char === undefined) {
			throw new PatternSyntaxSignal();
		}

		state.index += char === "\\" ? 2 : 1;

		if (char === "[") {
			depth += 1;
		} else if (char === "]") {
			depth -= 1;
		}
	}

	return fullSet();
}

function dotSet(state: ParserState) {
	return charSet(
		(code) => state.dotAll || (code !== 10 && code !== 13),
		state.dotAll ? COVERAGE_ALL : COVERAGE_SOME,
		COVERAGE_ALL,
	);
}

function wordSet(state: ParserState) {
	return charSet(
		isWord,
		COVERAGE_NONE,
		state.ignoreCase && state.unicode ? COVERAGE_SOME : COVERAGE_NONE,
	);
}

function literalSet(code: number, state: ParserState) {
	const set = rangeSet(code, code);

	return state.ignoreCase ? foldCase(set, state.unicode) : set;
}
