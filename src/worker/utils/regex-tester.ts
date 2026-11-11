import { BudgetExceededError } from "./budget.ts";
import { assessRegexCost, safeRegexTextLength, unsafePattern } from "./regex-safety.ts";

export const REGEX_FLAGS = ["d", "g", "i", "m", "s", "u", "v", "y"] as const;
export const REGEX_DEFAULT_FLAGS = "g";
export const REGEX_TESTER_LIMITS = {
	matches: 200,
	pattern: 200,
	replaced: 50_000,
	replacement: 1000,
	text: 10_000,
} as const;

export class RegexTesterError extends Error {}

export interface RegexTestOptions {
	flags?: string;
	pattern?: string;
	replacement?: string;
}

export interface RegexMatch {
	end: number;
	groups: (string | null)[];
	index: number;
	match: string;
	namedGroups: Record<string, string | null>;
}

export interface RegexTestReport {
	flags: string;
	matchCount: number;
	matches: RegexMatch[];
	pattern: string;
	replaced?: string;
	truncated: boolean;
}

type ReplacementPart =
	| { index: number; kind: "group" }
	| { kind: "after" | "before" | "match" }
	| { kind: "named"; name: string }
	| { kind: "text"; value: string };

export function testRegex(text: string, options: RegexTestOptions): RegexTestReport {
	const pattern = options.pattern ?? "";
	const flags = options.flags ?? REGEX_DEFAULT_FLAGS;
	const { replacement } = options;

	if (!pattern) {
		throw new RegexTesterError("Enter a regular expression in the pattern field.");
	}

	assertFlags(flags);
	assertLength(pattern, REGEX_TESTER_LIMITS.pattern, "The pattern");
	assertLength(text, REGEX_TESTER_LIMITS.text, "The test text");
	assertLength(replacement ?? "", REGEX_TESTER_LIMITS.replacement, "The replacement");

	const cost = assessRegexCost(pattern, flags);
	const isGlobal = flags.includes("g");
	const regex = compileRegex(pattern, isGlobal ? flags : `${flags}g`);

	if (!cost) {
		throw unsafePattern("it could not be analysed");
	}

	assertSafeTextLength(text, safeRegexTextLength(cost));

	const isUnicode = flags.includes("u") || flags.includes("v");
	const matches: RegexMatch[] = [];
	const replaced = boundedText(REGEX_TESTER_LIMITS.replaced);
	let cursor = 0;
	let isTruncated = false;
	let parts: ReplacementPart[] | undefined;
	let pendingReplacements = replacement === undefined ? 0 : isGlobal ? Infinity : 1;

	for (let found = regex.exec(text); found !== null; found = regex.exec(text)) {
		if (matches.length < REGEX_TESTER_LIMITS.matches) {
			matches.push(describeMatch(found));
		} else {
			isTruncated = true;
		}

		if (pendingReplacements > 0 && replacement !== undefined) {
			parts ??= parseReplacement(replacement, found.length - 1, found.groups !== undefined);
			replaced.append(text.slice(cursor, found.index));
			appendReplacement(replaced, parts, found, text);
			cursor = found.index + found[0].length;
			pendingReplacements -= 1;
		}

		if (isTruncated && pendingReplacements <= 0) {
			break;
		}

		if (found[0].length === 0) {
			regex.lastIndex = advanceIndex(text, regex.lastIndex, isUnicode);
		}
	}

	replaced.append(text.slice(cursor));

	return {
		flags,
		matchCount: matches.length,
		matches,
		pattern,
		...(replacement === undefined ? {} : { replaced: replaced.read() }),
		truncated: isTruncated,
	};
}

function assertFlags(flags: string) {
	if (flags.length > REGEX_FLAGS.length) {
		throw new RegexTesterError(`Use at most ${REGEX_FLAGS.length} flags, each one once.`);
	}

	const seen = new Set<string>();

	for (const flag of flags) {
		if (!REGEX_FLAGS.some((supported) => supported === flag)) {
			throw new RegexTesterError(
				`Unsupported flag "${flag}". Supported flags are ${REGEX_FLAGS.join(", ")}.`,
			);
		}

		if (seen.has(flag)) {
			throw new RegexTesterError(`The flag "${flag}" is repeated.`);
		}

		seen.add(flag);
	}

	if (seen.has("u") && seen.has("v")) {
		throw new RegexTesterError("The u and v flags cannot be used together.");
	}
}

function assertLength(value: string, limit: number, label: string) {
	if (value.length > limit) {
		throw new BudgetExceededError(`${label} is longer than the ${limit} character limit.`);
	}
}

function assertSafeTextLength(text: string, limit: number) {
	if (limit < 1) {
		throw unsafePattern("it has too many optional or repeated parts");
	}

	if (text.length > limit) {
		throw new BudgetExceededError(
			`This pattern can backtrack heavily, so it is too complex to run safely against more than ${limit} characters of test text. Shorten the text or simplify the pattern.`,
		);
	}
}

function compileRegex(pattern: string, flags: string) {
	try {
		return new RegExp(pattern, flags);
	} catch (error) {
		throw new RegexTesterError(
			error instanceof Error ? error.message : "Enter a valid regular expression.",
		);
	}
}

function describeMatch(found: RegExpExecArray): RegexMatch {
	const captures: (string | undefined)[] = found.slice(1);
	const named: Record<string, string | undefined> = found.groups ?? {};

	return {
		end: found.index + found[0].length,
		groups: captures.map((capture) => capture ?? null),
		index: found.index,
		match: found[0],
		namedGroups: Object.fromEntries(
			Object.entries(named).map(([name, capture]) => [name, capture ?? null]),
		),
	};
}

function advanceIndex(text: string, index: number, isUnicode: boolean) {
	const code = text.charCodeAt(index);
	const next = text.charCodeAt(index + 1);
	const isSurrogatePair = code >= 0xd800 && code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff;

	return index + (isUnicode && isSurrogatePair ? 2 : 1);
}

function boundedText(limit: number) {
	let value = "";

	return {
		append(piece: string) {
			if (value.length + piece.length > limit) {
				throw new BudgetExceededError(
					`The replaced text is longer than the ${limit} character limit.`,
				);
			}

			value += piece;
		},
		read: () => value,
	};
}

function parseReplacement(
	template: string,
	groupCount: number,
	hasNamedGroups: boolean,
): ReplacementPart[] {
	const parts: ReplacementPart[] = [];
	let index = 0;
	let literal = "";

	const push = (part: ReplacementPart, length: number) => {
		if (literal) {
			parts.push({ kind: "text", value: literal });
			literal = "";
		}

		parts.push(part);
		index += length;
	};

	while (index < template.length) {
		const next = template[index + 1];
		const closeName = next === "<" && hasNamedGroups ? template.indexOf(">", index) : -1;
		const group = template[index] === "$" ? replacementGroup(template, index, groupCount) : "";

		if (template[index] !== "$" || next === undefined) {
			literal += template[index];
			index += 1;
		} else if (next === "$") {
			literal += "$";
			index += 2;
		} else if (next === "&") {
			push({ kind: "match" }, 2);
		} else if (next === "`") {
			push({ kind: "before" }, 2);
		} else if (next === "'") {
			push({ kind: "after" }, 2);
		} else if (closeName !== -1) {
			push({ kind: "named", name: template.slice(index + 2, closeName) }, closeName + 1 - index);
		} else if (group) {
			push({ index: Number(group), kind: "group" }, group.length + 1);
		} else {
			literal += "$";
			index += 1;
		}
	}

	if (literal) {
		parts.push({ kind: "text", value: literal });
	}

	return parts;
}

function replacementGroup(template: string, index: number, groupCount: number) {
	const isReference = (digits: string) =>
		/^\d+$/.test(digits) && Number(digits) >= 1 && Number(digits) <= groupCount;
	const twoDigits = template.slice(index + 1, index + 3);
	const oneDigit = template.slice(index + 1, index + 2);

	if (twoDigits.length === 2 && isReference(twoDigits)) {
		return twoDigits;
	}

	return isReference(oneDigit) ? oneDigit : "";
}

function appendReplacement(
	output: ReturnType<typeof boundedText>,
	parts: readonly ReplacementPart[],
	found: RegExpExecArray,
	text: string,
) {
	const captures: (string | undefined)[] = found;
	const named: Record<string, string | undefined> | undefined = found.groups;

	for (const part of parts) {
		switch (part.kind) {
			case "after":
				output.append(text.slice(found.index + found[0].length));
				break;
			case "before":
				output.append(text.slice(0, found.index));
				break;
			case "group":
				output.append(captures[part.index] ?? "");
				break;
			case "match":
				output.append(found[0]);
				break;
			case "named":
				output.append(named?.[part.name] ?? "");
				break;
			case "text":
				output.append(part.value);
				break;
		}
	}
}
