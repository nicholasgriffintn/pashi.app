import { isRecord } from "../../shared/records.ts";
import { BudgetExceededError } from "./budget.ts";
import { assertJsonWithinBudget, createJsonOutputBudget } from "./json-budget.ts";
import { JSON_PATH_ROOT, jsonPathIndex, jsonPathKey } from "./json-path.ts";

export const JSON_QUERY_LIMITS = {
	depth: 64,
	nodes: 100_000,
	pathLength: 200,
	results: 1000,
	segments: 20,
} as const;

const MAX_INDEX_DIGITS = 9;
const SUPPORTED_SELECTORS = "$, .key, ['key'], [0], [-1], .*, [*], ..key and ..*";

export class JsonQueryError extends Error {}

type JsonQuerySelector =
	| { index: number; kind: "index" }
	| { key: string; kind: "key" }
	| { kind: "wildcard" };

interface JsonQuerySegment {
	descend: boolean;
	selector: JsonQuerySelector;
}

interface SelectorRead {
	next: number;
	selector: JsonQuerySelector;
}

export interface JsonQueryMatch {
	path: string;
	value: unknown;
}

export interface JsonQueryResult {
	count: number;
	path: string;
	results: JsonQueryMatch[];
}

export function queryJson(document: unknown, path: string): JsonQueryResult {
	const segments = parseJsonQuery(path);

	assertJsonWithinBudget([document], {
		maxDepth: JSON_QUERY_LIMITS.depth,
		maxNodes: JSON_QUERY_LIMITS.nodes,
	});

	let visited = 0;

	const visit = () => {
		visited += 1;

		if (visited > JSON_QUERY_LIMITS.nodes) {
			throw new BudgetExceededError(
				`The query visits more than ${JSON_QUERY_LIMITS.nodes} values. Narrow the path.`,
			);
		}
	};

	let current: JsonQueryMatch[] = [{ path: JSON_PATH_ROOT, value: document }];

	for (const segment of segments) {
		const next: JsonQueryMatch[] = [];

		for (const node of current) {
			if (segment.descend) {
				selectFromDescendants(node, segment.selector, next, visit);
			} else {
				selectFrom(node, segment.selector, next, visit);
			}
		}

		current = next;
	}

	if (current.length > JSON_QUERY_LIMITS.results) {
		throw new BudgetExceededError(
			`The query matches more than ${JSON_QUERY_LIMITS.results} values. Narrow the path.`,
		);
	}

	const spend = createJsonOutputBudget();

	for (const match of current) {
		spend(match.path, match.value);
	}

	return { count: current.length, path, results: current };
}

function parseJsonQuery(path: string): JsonQuerySegment[] {
	if (path.length > JSON_QUERY_LIMITS.pathLength) {
		throw new BudgetExceededError(
			`The path is longer than the ${JSON_QUERY_LIMITS.pathLength} character limit.`,
		);
	}

	if (!path.startsWith(JSON_PATH_ROOT)) {
		throw new JsonQueryError("Start the path with $, for example $.users[0].name.");
	}

	const segments: JsonQuerySegment[] = [];
	let index = JSON_PATH_ROOT.length;

	while (index < path.length) {
		if (segments.length >= JSON_QUERY_LIMITS.segments) {
			throw new BudgetExceededError(
				`The path has more than ${JSON_QUERY_LIMITS.segments} segments.`,
			);
		}

		const descend = path.startsWith("..", index);
		const isDotted = descend || path[index] === ".";

		if (descend) {
			index += 2;
		} else if (isDotted) {
			index += 1;
		}

		const read =
			path[index] === "[" && (descend || !isDotted)
				? readBracketSelector(path, index)
				: readDotSelector(path, index, isDotted);

		segments.push({ descend, selector: read.selector });
		index = read.next;
	}

	return segments;
}

function readDotSelector(path: string, index: number, isDotted: boolean): SelectorRead {
	if (!isDotted) {
		throw unexpectedCharacter(path, index);
	}

	if (path[index] === "*") {
		return { next: index + 1, selector: { kind: "wildcard" } };
	}

	let end = index;

	while (end < path.length && isNameCharacter(path.charCodeAt(end))) {
		end += 1;
	}

	if (end === index) {
		throw unexpectedCharacter(path, index);
	}

	return { next: end, selector: { key: path.slice(index, end), kind: "key" } };
}

function readBracketSelector(path: string, index: number): SelectorRead {
	const start = index + 1;
	const first = path[start];

	if (first === "?") {
		throw new JsonQueryError("Filter expressions such as [?(@.price < 10)] are not supported.");
	}

	if (first === "(") {
		throw new JsonQueryError("Script expressions such as [(@.length-1)] are not supported.");
	}

	if (first === "*") {
		return { next: closeBracket(path, start + 1), selector: { kind: "wildcard" } };
	}

	if (first === "'" || first === '"') {
		return readQuotedSelector(path, start);
	}

	return readIndexSelector(path, start);
}

function readQuotedSelector(path: string, start: number): SelectorRead {
	const quote = path[start];
	let key = "";
	let index = start + 1;

	while (index < path.length && path[index] !== quote) {
		if (path[index] === "\\") {
			index += 1;
		}

		if (index < path.length) {
			key += path[index];
			index += 1;
		}
	}

	if (index >= path.length) {
		throw new JsonQueryError("The path has a quoted key without a closing quote.");
	}

	return { next: closeBracket(path, index + 1), selector: { key, kind: "key" } };
}

function readIndexSelector(path: string, start: number): SelectorRead {
	const digitsStart = path[start] === "-" ? start + 1 : start;
	let end = digitsStart;

	while (end < path.length && isDigit(path.charCodeAt(end))) {
		end += 1;
	}

	if (path[end] === ":") {
		throw new JsonQueryError("Array slices such as [0:2] are not supported.");
	}

	if (end === digitsStart) {
		throw unexpectedCharacter(path, end);
	}

	if (end - digitsStart > MAX_INDEX_DIGITS) {
		throw new JsonQueryError("The path has an array index that is too large.");
	}

	return {
		next: closeBracket(path, end),
		selector: { index: Number(path.slice(start, end)), kind: "index" },
	};
}

function closeBracket(path: string, index: number) {
	if (path[index] === ",") {
		throw new JsonQueryError("Unions such as [0,1] or ['a','b'] are not supported.");
	}

	if (path[index] === ":") {
		throw new JsonQueryError("Array slices such as [0:2] are not supported.");
	}

	if (path[index] !== "]") {
		throw unexpectedCharacter(path, index);
	}

	return index + 1;
}

function unexpectedCharacter(path: string, index: number) {
	const found = index < path.length ? `"${path[index]}"` : "the end of the path";

	return new JsonQueryError(
		`Unexpected ${found} at position ${index}. Supported selectors are ${SUPPORTED_SELECTORS}.`,
	);
}

function isDigit(code: number) {
	return code >= 48 && code <= 57;
}

function isNameCharacter(code: number) {
	return (
		isDigit(code) ||
		(code >= 65 && code <= 90) ||
		(code >= 97 && code <= 122) ||
		code === 36 ||
		code === 45 ||
		code === 95 ||
		code > 127
	);
}

function selectFromDescendants(
	node: JsonQueryMatch,
	selector: JsonQuerySelector,
	into: JsonQueryMatch[],
	visit: () => void,
) {
	visit();
	selectFrom(node, selector, into, visit);

	for (const child of childMatches(node)) {
		selectFromDescendants(child, selector, into, visit);
	}
}

function selectFrom(
	node: JsonQueryMatch,
	selector: JsonQuerySelector,
	into: JsonQueryMatch[],
	visit: () => void,
) {
	if (selector.kind === "wildcard") {
		for (const child of childMatches(node)) {
			visit();
			into.push(child);
		}

		return;
	}

	const match =
		selector.kind === "index" ? indexMatch(node, selector.index) : keyMatch(node, selector.key);

	if (match) {
		visit();
		into.push(match);
	}
}

function indexMatch(node: JsonQueryMatch, index: number): JsonQueryMatch | undefined {
	const { path, value } = node;

	if (!Array.isArray(value)) {
		return undefined;
	}

	const position = index < 0 ? value.length + index : index;

	return position >= 0 && position < value.length
		? { path: jsonPathIndex(path, position), value: value[position] }
		: undefined;
}

function keyMatch(node: JsonQueryMatch, key: string): JsonQueryMatch | undefined {
	const { path, value } = node;

	return isRecord(value) && Object.hasOwn(value, key)
		? { path: jsonPathKey(path, key), value: value[key] }
		: undefined;
}

function childMatches(node: JsonQueryMatch): JsonQueryMatch[] {
	const { path, value } = node;

	if (Array.isArray(value)) {
		return value.map((item: unknown, index) => ({ path: jsonPathIndex(path, index), value: item }));
	}

	if (isRecord(value)) {
		return Object.entries(value).map(([key, item]) => ({
			path: jsonPathKey(path, key),
			value: item,
		}));
	}

	return [];
}
