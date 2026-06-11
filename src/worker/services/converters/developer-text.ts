export type DeveloperTextFormat =
	| "diff-lines"
	| "minify-css"
	| "minify-html"
	| "minify-json"
	| "minify-xml"
	| "pretty-css"
	| "pretty-html"
	| "pretty-json"
	| "pretty-xml";

export const DEVELOPER_TEXT_FORMATS: readonly DeveloperTextFormat[] = [
	"diff-lines",
	"pretty-json",
	"minify-json",
	"pretty-css",
	"minify-css",
	"pretty-html",
	"minify-html",
	"pretty-xml",
	"minify-xml",
];

export class DeveloperTextError extends Error {}

interface DeveloperTextOptions {
	left?: string;
	right?: string;
	separator?: string;
}

const HTML_VOID_TAGS = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);

export function isDeveloperTextFormat(value: string): value is DeveloperTextFormat {
	return DEVELOPER_TEXT_FORMATS.some((format) => format === value);
}

export function transformDeveloperText(
	input: string,
	format: DeveloperTextFormat,
	options: DeveloperTextOptions = {},
) {
	switch (format) {
		case "diff-lines":
			return diffLines(input, options);
		case "minify-css":
			return minifyCss(input);
		case "minify-html":
			return minifyMarkup(input, "html");
		case "minify-json":
			return JSON.stringify(parseJson(input));
		case "minify-xml":
			return minifyMarkup(input, "xml");
		case "pretty-css":
			return prettyCss(input);
		case "pretty-html":
			return prettyMarkup(input, "html");
		case "pretty-json":
			return JSON.stringify(parseJson(input), null, 2);
		case "pretty-xml":
			return prettyMarkup(input, "xml");
	}
}

function parseJson(input: string): unknown {
	try {
		return JSON.parse(input);
	} catch {
		throw new DeveloperTextError("Enter valid JSON.");
	}
}

function diffLines(input: string, options: DeveloperTextOptions) {
	const [left, right] = diffInputs(input, options);
	const leftLines = left.split(/\r?\n/);
	const rightLines = right.split(/\r?\n/);
	const table = lcsTable(leftLines, rightLines);
	const output: string[] = [];

	let leftIndex = 0;
	let rightIndex = 0;
	while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
		if (leftLines[leftIndex] === rightLines[rightIndex]) {
			output.push(`  ${leftLines[leftIndex] ?? ""}`);
			leftIndex += 1;
			rightIndex += 1;
			continue;
		}

		if (
			leftIndex < leftLines.length &&
			(rightIndex === rightLines.length || table[leftIndex + 1][rightIndex] >= table[leftIndex][rightIndex + 1])
		) {
			output.push(`- ${leftLines[leftIndex]}`);
			leftIndex += 1;
			continue;
		}

		if (rightIndex < rightLines.length) {
			output.push(`+ ${rightLines[rightIndex]}`);
			rightIndex += 1;
		}
	}

	return output.join("\n");
}

function diffInputs(input: string, options: DeveloperTextOptions): [string, string] {
	if (options.left !== undefined || options.right !== undefined) {
		return [options.left ?? "", options.right ?? ""];
	}

	const separator = options.separator || "\n---\n";
	const index = input.indexOf(separator);
	if (index === -1) {
		throw new DeveloperTextError("Provide left and right fields, or separate two text blocks with a line containing ---.");
	}

	return [
		input.slice(0, index),
		input.slice(index + separator.length),
	];
}

function lcsTable(left: readonly string[], right: readonly string[]) {
	const table = Array.from({ length: left.length + 1 }, () => Array.from({ length: right.length + 1 }, () => 0));
	for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
		for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
			table[leftIndex][rightIndex] = left[leftIndex] === right[rightIndex]
				? table[leftIndex + 1][rightIndex + 1] + 1
				: Math.max(table[leftIndex + 1][rightIndex], table[leftIndex][rightIndex + 1]);
		}
	}

	return table;
}

function minifyCss(input: string) {
	return input
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\s+/g, " ")
		.replace(/\s*([{}:;,>+~])\s*/g, "$1")
		.replace(/;}/g, "}")
		.trim();
}

function prettyCss(input: string) {
	const minified = minifyCss(input);
	const lines: string[] = [];
	let indent = 0;
	let current = "";

	for (const char of minified) {
		if (char === "{") {
			lines.push(`${tabs(indent)}${current.trim()} {`);
			current = "";
			indent += 1;
			continue;
		}

		if (char === "}") {
			if (current.trim()) {
				lines.push(`${tabs(indent)}${cssDeclaration(current.trim())}`);
			}
			indent = Math.max(0, indent - 1);
			lines.push(`${tabs(indent)}}`);
			current = "";
			continue;
		}

		if (char === ";") {
			if (current.trim()) {
				lines.push(`${tabs(indent)}${current.trim()};`);
			}
			current = "";
			continue;
		}

		if (char === ":") {
			current += ": ";
			continue;
		}

		current += char;
	}

	if (current.trim()) {
		lines.push(`${tabs(indent)}${current.trim()}`);
	}

	return lines.join("\n");
}

function cssDeclaration(value: string) {
	return value.includes(":") && !value.endsWith(";") ? `${value};` : value;
}

function minifyMarkup(input: string, kind: "html" | "xml") {
	const withoutComments = kind === "html"
		? input.replace(/<!--[\s\S]*?-->/g, "")
		: input.replace(/<!--[\s\S]*?-->/g, "").replace(/<\?xml\b[^>]*\?>/i, (match) => match.trim());
	return withoutComments
		.replace(/>\s+</g, "><")
		.replace(/\s{2,}/g, " ")
		.trim();
}

function prettyMarkup(input: string, kind: "html" | "xml") {
	const tokens = minifyMarkup(input, kind).match(/<[^>]+>|[^<]+/g) ?? [];
	const lines: string[] = [];
	let indent = 0;

	for (const token of tokens) {
		const trimmed = token.trim();
		if (!trimmed) {
			continue;
		}

		if (isClosingTag(trimmed)) {
			indent = Math.max(0, indent - 1);
			lines.push(`${tabs(indent)}${trimmed}`);
			continue;
		}

		if (isOpeningTag(trimmed, kind)) {
			lines.push(`${tabs(indent)}${trimmed}`);
			indent += 1;
			continue;
		}

		lines.push(`${tabs(indent)}${trimmed}`);
	}

	return lines.join("\n");
}

function isClosingTag(token: string) {
	return /^<\//.test(token);
}

function isOpeningTag(token: string, kind: "html" | "xml") {
	if (!/^<[A-Za-z]/.test(token) || /\/>$/.test(token)) {
		return false;
	}

	if (kind === "html") {
		const name = /^<([A-Za-z0-9-]+)/.exec(token)?.[1]?.toLowerCase();
		return !name || !HTML_VOID_TAGS.has(name);
	}

	return true;
}

function tabs(count: number) {
	return "\t".repeat(count);
}
