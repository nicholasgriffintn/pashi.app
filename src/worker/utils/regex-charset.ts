const ASCII_SIZE = 128;
const WIDE_SPACE_RANGES: readonly (readonly [number, number])[] = [
	[0xa0, 0xa0],
	[0x1680, 0x1680],
	[0x2000, 0x200a],
	[0x2028, 0x2029],
	[0x202f, 0x202f],
	[0x205f, 0x205f],
	[0x3000, 0x3000],
	[0xfeff, 0xfeff],
];

export const COVERAGE_NONE = 0;
export const COVERAGE_SOME = 1;
export const COVERAGE_ALL = 2;

export interface CharSet {
	ascii: boolean[];
	isOpaque: boolean;
	other: number;
	space: number;
}

export function isDigit(code: number) {
	return code >= 48 && code <= 57;
}

export function isLetter(code: number) {
	return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

export function isHexDigit(code: number) {
	return isDigit(code) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102);
}

export function isWord(code: number) {
	return isDigit(code) || isLetter(code) || code === 95;
}

export function isAsciiSpace(code: number) {
	return (code >= 9 && code <= 13) || code === 32;
}

export function charSet(
	matches: (code: number) => boolean,
	space = COVERAGE_NONE,
	other = COVERAGE_NONE,
): CharSet {
	return {
		ascii: Array.from({ length: ASCII_SIZE }, (_, code) => matches(code)),
		isOpaque: false,
		other,
		space,
	};
}

export function fullSet(): CharSet {
	return { ...charSet(() => true, COVERAGE_ALL, COVERAGE_ALL), isOpaque: true };
}

export function rangeSet(from: number, to: number): CharSet {
	const set = charSet((code) => code >= from && code <= to);

	if (to < ASCII_SIZE) {
		return set;
	}

	const start = Math.max(from, ASCII_SIZE);
	let spaces = 0;

	for (const [low, high] of WIDE_SPACE_RANGES) {
		spaces += Math.max(0, Math.min(to, high) - Math.max(start, low) + 1);
	}

	set.space = spaces > 0 ? COVERAGE_SOME : COVERAGE_NONE;
	set.other = to - start + 1 > spaces ? COVERAGE_SOME : COVERAGE_NONE;

	return set;
}

export function foldCase(set: CharSet, unicode: boolean): CharSet {
	const ascii = set.ascii.map((value, code) => value || (isLetter(code) && set.ascii[code ^ 32]));
	const foldsBeyondAscii = unicode && [75, 83, 107, 115].some((code) => ascii[code]);

	if (unicode && set.other > COVERAGE_NONE) {
		for (const code of [75, 83, 107, 115]) {
			ascii[code] = true;
		}
	}

	return {
		...set,
		ascii,
		other: foldsBeyondAscii ? Math.max(set.other, COVERAGE_SOME) : set.other,
	};
}

export function union(left: CharSet, right: CharSet): CharSet {
	if (left.isOpaque || right.isOpaque) {
		return fullSet();
	}

	return {
		ascii: left.ascii.map((value, code) => value || right.ascii[code]),
		isOpaque: false,
		other: Math.max(left.other, right.other),
		space: Math.max(left.space, right.space),
	};
}

export function intersection(left: CharSet, right: CharSet): CharSet {
	return {
		ascii: left.ascii.map((value, code) => value && right.ascii[code]),
		isOpaque: false,
		other: Math.min(left.other, right.other),
		space: Math.min(left.space, right.space),
	};
}

export function complement(set: CharSet): CharSet {
	if (set.isOpaque) {
		return set;
	}

	return {
		ascii: set.ascii.map((value) => !value),
		isOpaque: false,
		other: COVERAGE_ALL - set.other,
		space: COVERAGE_ALL - set.space,
	};
}

export function isEmpty(set: CharSet) {
	return set.other === COVERAGE_NONE && set.space === COVERAGE_NONE && !set.ascii.includes(true);
}

export function overlaps(left: CharSet, right: CharSet) {
	return (
		(left.other > COVERAGE_NONE && right.other > COVERAGE_NONE) ||
		(left.space > COVERAGE_NONE && right.space > COVERAGE_NONE) ||
		left.ascii.some((value, code) => value && right.ascii[code])
	);
}
