import { parseInteger } from "./generation.ts";

export type TextTransformFormat =
	| "ascii-decimal"
	| "ascii-hex"
	| "ascii-octal"
	| "binary"
	| "camel"
	| "character-count"
	| "dedupe-words"
	| "from-binary"
	| "from-hex"
	| "hashtags"
	| "hex"
	| "kebab"
	| "leet"
	| "list"
	| "lowercase"
	| "normalize-nfc"
	| "normalize-nfd"
	| "repeat"
	| "replace"
	| "remove-whitespace"
	| "remove-zero-width"
	| "reverse"
	| "sentence-count"
	| "snake"
	| "sort-lines"
	| "title"
	| "unicode-escape"
	| "unicode-unescape"
	| "unique-lines"
	| "uppercase"
	| "upside-down"
	| "url-decode"
	| "url-encode"
	| "vertical"
	| "word-count"
	| "word-frequency"
	| "text-size";

export const TEXT_TRANSFORM_FORMATS: readonly TextTransformFormat[] = [
	"lowercase",
	"uppercase",
	"title",
	"kebab",
	"snake",
	"camel",
	"reverse",
	"sort-lines",
	"unique-lines",
	"dedupe-words",
	"word-count",
	"character-count",
	"sentence-count",
	"text-size",
	"word-frequency",
	"hashtags",
	"list",
	"repeat",
	"replace",
	"leet",
	"upside-down",
	"binary",
	"from-binary",
	"hex",
	"from-hex",
	"ascii-decimal",
	"ascii-hex",
	"ascii-octal",
	"url-encode",
	"url-decode",
	"unicode-escape",
	"unicode-unescape",
	"normalize-nfc",
	"normalize-nfd",
	"remove-whitespace",
	"remove-zero-width",
	"vertical",
];

export class TextTransformError extends Error {}

const LEET_REPLACEMENTS: Record<string, string> = {
	a: "4",
	e: "3",
	i: "1",
	l: "1",
	o: "0",
	s: "5",
	t: "7",
};
const UPSIDE_DOWN_REPLACEMENTS: Record<string, string> = {
	"!": "¡",
	".": "˙",
	"?": "¿",
	a: "ɐ",
	b: "q",
	c: "ɔ",
	d: "p",
	e: "ǝ",
	f: "ɟ",
	g: "ƃ",
	h: "ɥ",
	i: "ᴉ",
	j: "ɾ",
	k: "ʞ",
	l: "l",
	m: "ɯ",
	n: "u",
	o: "o",
	p: "d",
	q: "b",
	r: "ɹ",
	s: "s",
	t: "ʇ",
	u: "n",
	v: "ʌ",
	w: "ʍ",
	x: "x",
	y: "ʎ",
	z: "z",
};

export function isTextTransformFormat(value: string): value is TextTransformFormat {
	return TEXT_TRANSFORM_FORMATS.some((format) => format === value);
}

export function transformText(input: string, format: TextTransformFormat, fields: Record<string, string> = {}) {
	switch (format) {
		case "ascii-decimal":
			return codePoints(input, 10);
		case "ascii-hex":
			return codePoints(input, 16);
		case "ascii-octal":
			return codePoints(input, 8);
		case "binary":
			return bytes(input).map((byte) => byte.toString(2).padStart(8, "0")).join(" ");
		case "camel":
			return words(input).map((word, index) => index === 0 ? word.toLowerCase() : capitalise(word.toLowerCase())).join("");
		case "character-count":
			return String([...input].length);
		case "dedupe-words":
			return uniqueBy(words(input), (word) => word.toLowerCase()).join(" ");
		case "from-binary":
			return decodeBytes(input, 2);
		case "from-hex":
			return decodeBytes(input, 16);
		case "hashtags":
			return words(input).map((word) => `#${word}`).join(" ");
		case "hex":
			return bytes(input).map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
		case "kebab":
			return words(input).map((word) => word.toLowerCase()).join("-");
		case "leet":
			return input.replace(/[aeilost]/gi, (char) => LEET_REPLACEMENTS[char.toLowerCase()] ?? char);
		case "list":
			return input.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).join("\n");
		case "lowercase":
			return input.toLowerCase();
		case "normalize-nfc":
			return input.normalize("NFC");
		case "normalize-nfd":
			return input.normalize("NFD");
		case "repeat":
			return repeatInput(input, fields.count);
		case "replace":
			return replaceText(input, fields.search, fields.replace);
		case "remove-whitespace":
			return input.replace(/\s+/g, "");
		case "remove-zero-width":
			return input.replace(/[\u200B-\u200D\uFEFF]/g, "");
		case "reverse":
			return [...input].reverse().join("");
		case "sentence-count":
			return String(sentences(input).length);
		case "snake":
			return words(input).map((word) => word.toLowerCase()).join("_");
		case "sort-lines":
			return input.split(/\r?\n/).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" })).join("\n");
		case "title":
			return words(input).map((word) => capitalise(word.toLowerCase())).join(" ");
		case "text-size": {
			const byteCount = bytes(input).length;
			return `${byteCount} ${byteCount === 1 ? "byte" : "bytes"}`;
		}
		case "unicode-escape":
			return unicodeEscape(input);
		case "unicode-unescape":
			return unicodeUnescape(input);
		case "unique-lines":
			return uniqueBy(input.split(/\r?\n/), (line) => line).join("\n");
		case "uppercase":
			return input.toUpperCase();
		case "upside-down":
			return [...input.toLowerCase()].reverse().map((char) => UPSIDE_DOWN_REPLACEMENTS[char] ?? char).join("");
		case "url-decode":
			return decodeUrlComponent(input);
		case "url-encode":
			return encodeURIComponent(input);
		case "vertical":
			return [...input].join("\n");
		case "word-count":
			return String(words(input).length);
		case "word-frequency":
			return wordFrequency(input);
	}
}

function words(input: string) {
	return input.match(/[A-Za-z0-9]+/g) ?? [];
}

function sentences(input: string) {
	return input.match(/[^.!?]+[.!?]+/g) ?? [];
}

function uniqueBy(values: string[], keyFor: (value: string) => string) {
	const seen = new Set<string>();
	const output: string[] = [];
	for (const value of values) {
		const key = keyFor(value);
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		output.push(value);
	}

	return output;
}

function repeatInput(input: string, countValue: string | undefined) {
	const count = parseInteger(countValue ?? "", 2, 1, 100);
	return Array.from({ length: count }, () => input).join("\n");
}

function replaceText(input: string, search: string | undefined, replacement: string | undefined) {
	return search ? input.replaceAll(search, replacement ?? "") : input;
}

function wordFrequency(input: string) {
	const counts = new Map<string, number>();
	for (const word of words(input).map((value) => value.toLowerCase())) {
		counts.set(word, (counts.get(word) ?? 0) + 1);
	}

	return [...counts.entries()]
		.sort(([leftWord, leftCount], [rightWord, rightCount]) => rightCount - leftCount || leftWord.localeCompare(rightWord))
		.map(([word, count]) => `${word}: ${count}`)
		.join("\n");
}

function capitalise(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function bytes(input: string) {
	return [...new TextEncoder().encode(input)];
}

function decodeBytes(input: string, radix: number) {
	const values = input
		.trim()
		.split(/[\s,]+/)
		.filter(Boolean)
		.map((value) => parseByteToken(value, radix));
	if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
		throw new TextTransformError("Encoded text contains an invalid byte.");
	}

	return new TextDecoder().decode(new Uint8Array(values));
}

function parseByteToken(value: string, radix: number) {
	if (!isByteToken(value, radix)) {
		return Number.NaN;
	}

	return Number.parseInt(value, radix);
}

function isByteToken(value: string, radix: number) {
	switch (radix) {
		case 2:
			return /^[01]{1,8}$/.test(value);
		case 16:
			return /^[0-9a-fA-F]{1,2}$/.test(value);
		default:
			return false;
	}
}

function decodeUrlComponent(input: string) {
	try {
		return decodeURIComponent(input.replace(/\+/g, " "));
	} catch {
		throw new TextTransformError("Enter valid URL-encoded text.");
	}
}

function codePoints(input: string, radix: number) {
	return [...input].map((char) => char.codePointAt(0)?.toString(radix) ?? "").join(" ");
}

function unicodeEscape(input: string) {
	return [...input].map((char) => {
		const codePoint = char.codePointAt(0) ?? 0;
		if (codePoint <= 0xffff) {
			return escapeCodeUnit(codePoint);
		}

		const value = codePoint - 0x10000;
		return `${escapeCodeUnit((value >> 10) + 0xd800)}${escapeCodeUnit((value & 0x3ff) + 0xdc00)}`;
	}).join("");
}

function unicodeUnescape(input: string) {
	return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, codeUnit: string) =>
		String.fromCharCode(Number.parseInt(codeUnit, 16)),
	);
}

function escapeCodeUnit(value: number) {
	return `\\u${value.toString(16).padStart(4, "0")}`;
}
