import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import {
	parseBoolean,
	parseCount,
	parseChoice,
	parseInteger,
	parseNumber,
	randomCharacters,
	randomIntegerInRange,
	randomUnitInterval,
	singleOrList,
} from "../../../utils/generation";
import { fieldsResult, textResult } from "./result";

const NUMBER_TYPES = ["integer", "decimal", "prime", "percentage", "even", "odd", "negative"] as const;

export function createNumberResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	switch (generator.id) {
		case "fraction":
			return fieldsResult(generator, request.input, createFraction(request));
		case "hex-number":
			return textResult(generator, request.input, createBaseNumber(request, 16));
		case "number":
			return textResult(generator, request.input, createNumbers(request));
		case "binary":
			return textResult(generator, request.input, createBinary(request));
		case "octal-number":
			return textResult(generator, request.input, createBaseNumber(request, 8));
		default:
			return undefined;
	}
}

function createNumbers(request: GeneratorRequest) {
	const type = parseChoice(request.fields.type ?? request.fields.mode, NUMBER_TYPES, "integer");
	const count = parseInteger(request.fields.count ?? "", 10, 1, 1000);
	const values = Array.from({ length: count }, () => createNumberValue(request, type));
	return singleOrList(values);
}

function createNumberValue(request: GeneratorRequest, type: (typeof NUMBER_TYPES)[number]) {
	switch (type) {
		case "decimal":
			return createDecimal(request);
		case "even":
			return `${createParityInteger(request, 0)}`;
		case "negative":
			return `${createNegativeInteger(request)}`;
		case "odd":
			return `${createParityInteger(request, 1)}`;
		case "percentage":
			return `${createPercentage(request)}%`;
		case "prime":
			return `${createPrime(request)}`;
		case "integer":
			return `${createInteger(request)}`;
	}
}

function createBinaryValues(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 10, 1000);
	const bits = parseInteger(request.fields.bits ?? "", 8, 1, 64);
	return Array.from({ length: count }, () => randomCharacters("01", bits));
}

function createBinary(request: GeneratorRequest) {
	return singleOrList(createBinaryValues(request));
}

function createInteger(request: GeneratorRequest) {
	const min = parseInteger(request.fields.min ?? "", 1, -1_000_000, 1_000_000);
	const max = parseInteger(request.fields.max ?? "", 100, -1_000_000, 1_000_000);
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	return lower + randomIntegerInRange(upper - lower + 1);
}

function createDecimal(request: GeneratorRequest) {
	const min = parseNumber(request.fields.min ?? "", 0, -1_000_000_000, 1_000_000_000);
	const max = parseNumber(request.fields.max ?? "", 1, -1_000_000_000, 1_000_000_000);
	const decimals = parseInteger(request.fields.decimals ?? "", 2, 1, 10);
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	return (lower + randomUnitInterval() * (upper - lower)).toFixed(decimals);
}

function createPercentage(request: GeneratorRequest) {
	const decimals = parseInteger(request.fields.decimals ?? "", 2, 0, 10);
	return (randomUnitInterval() * 100).toFixed(decimals);
}

function createNegativeInteger(request: GeneratorRequest) {
	const min = parseInteger(request.fields.min ?? "", -100, -1_000_000, -1);
	const max = parseInteger(request.fields.max ?? "", -1, -1_000_000, -1);
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	return lower + randomIntegerInRange(upper - lower + 1);
}

function createParityInteger(request: GeneratorRequest, parity: 0 | 1) {
	const min = parseInteger(request.fields.min ?? "", 1, -1_000_000, 1_000_000);
	const max = parseInteger(request.fields.max ?? "", 100, -1_000_000, 1_000_000);
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	const first = firstWithParity(lower, parity);
	const last = firstWithParity(upper, parity === 0 ? 0 : 1);
	const final = last > upper ? last - 2 : last;

	if (first > upper || final < first) {
		throw new Error(`No ${parity === 0 ? "even" : "odd"} number exists in the selected range.`);
	}

	return first + randomIntegerInRange(Math.floor((final - first) / 2) + 1) * 2;
}

function firstWithParity(value: number, parity: 0 | 1) {
	const remainder = Math.abs(value % 2);
	return remainder === parity ? value : value + 1;
}

function createPrime(request: GeneratorRequest) {
	const min = parseInteger(request.fields.min ?? "", 1, -1_000_000, 1_000_000);
	const max = parseInteger(request.fields.max ?? "", 100, -1_000_000, 1_000_000);
	const lower = Math.max(2, Math.min(min, max));
	const upper = Math.max(2, Math.max(min, max));
	const primes = primesInRange(lower, upper);
	if (primes.length === 0) {
		throw new Error("No prime number exists in the selected range.");
	}

	return primes[randomIntegerInRange(primes.length)];
}

function primesInRange(min: number, max: number) {
	const primes: number[] = [];
	for (let value = min; value <= max; value += 1) {
		if (isPrime(value)) {
			primes.push(value);
		}
	}

	return primes;
}

function isPrime(value: number) {
	if (value < 2) {
		return false;
	}
	if (value === 2) {
		return true;
	}
	if (value % 2 === 0) {
		return false;
	}
	for (let divisor = 3; divisor * divisor <= value; divisor += 2) {
		if (value % divisor === 0) {
			return false;
		}
	}

	return true;
}

function createBaseNumber(request: GeneratorRequest, base: 8 | 16) {
	const count = parseCount(request.fields.count ?? "", 10, 100);
	const length = parseInteger(request.fields.length ?? "", 8, 1, 64);
	const includePrefix = parseBoolean(request.fields.prefix, true);
	const uppercase = base === 16 ? parseBoolean(request.fields.uppercase, true) : false;
	const unique = parseBoolean(request.fields.unique, false);
	const digits = base === 16 ? "0123456789abcdef" : "01234567";
	const prefix = includePrefix ? base === 16 ? "0x" : "0o" : "";
	const values = unique
		? createUniqueBaseNumbers({ count, digits, length, prefix, uppercase })
		: Array.from({ length: count }, () => createBaseNumberValue({ digits, length, prefix, uppercase }));

	return singleOrList(values);
}

function createUniqueBaseNumbers({
	count,
	digits,
	length,
	prefix,
	uppercase,
}: {
	count: number;
	digits: string;
	length: number;
	prefix: string;
	uppercase: boolean;
}) {
	const values = new Set<string>();
	let attempts = 0;

	while (values.size < count && attempts < count * 30) {
		values.add(createBaseNumberValue({ digits, length, prefix, uppercase }));
		attempts += 1;
	}

	return [...values];
}

function createBaseNumberValue({
	digits,
	length,
	prefix,
	uppercase,
}: {
	digits: string;
	length: number;
	prefix: string;
	uppercase: boolean;
}) {
	const value = randomCharacters(digits, length);
	return `${prefix}${uppercase ? value.toUpperCase() : value}`;
}

function createFraction(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 100);
	const values = Array.from({ length: count }, () => createFractionRecord(request));
	return singleOrList(values);
}

function createFractionRecord(request: GeneratorRequest) {
	const type = parseFractionType(request.fields.type);
	const shouldSimplify = request.fields.simplify !== "no";
	const maxNumerator = parseInteger(request.fields.maxNumerator ?? "", 12, 1, 10_000);
	const maxDenominator = parseInteger(request.fields.maxDenominator ?? "", 12, 2, 10_000);
	const raw = createRawFraction(type, maxNumerator, maxDenominator);
	const reduced = shouldSimplify ? simplifyFraction(raw.numerator, raw.denominator) : raw;
	const mixed = toMixedNumber(reduced.numerator, reduced.denominator);

	return {
		decimal: `${reduced.numerator / reduced.denominator}`,
		denominator: `${reduced.denominator}`,
		fraction: `${reduced.numerator}/${reduced.denominator}`,
		mixed: formatMixedNumber(mixed),
		numerator: `${reduced.numerator}`,
		simplified: shouldSimplify ? "yes" : "no",
		type,
	};
}

function parseFractionType(value: string | undefined): FractionType {
	if (value === "improper" || value === "mixed") {
		return value;
	}

	return "proper";
}

function createRawFraction(type: FractionType, maxNumerator: number, maxDenominator: number) {
	if (type === "proper") {
		const denominator = randomIntegerInRange(maxDenominator - 1) + 2;
		return {
			denominator,
			numerator: randomIntegerInRange(Math.min(maxNumerator, denominator - 1)) + 1,
		};
	}

	if (type === "mixed") {
		const denominator = randomIntegerInRange(maxDenominator - 1) + 2;
		const whole = randomIntegerInRange(maxNumerator) + 1;
		const numerator = randomIntegerInRange(denominator - 1) + 1;
		return {
			denominator,
			numerator: whole * denominator + numerator,
		};
	}

	const denominator = randomIntegerInRange(maxDenominator - 1) + 2;
	const numeratorMax = Math.max(maxNumerator, denominator);
	const numerator = denominator + randomIntegerInRange(numeratorMax - denominator + 1);
	return { denominator, numerator };
}

function simplifyFraction(numerator: number, denominator: number) {
	const divisor = greatestCommonDivisor(numerator, denominator);
	return {
		denominator: denominator / divisor,
		numerator: numerator / divisor,
	};
}

function toMixedNumber(numerator: number, denominator: number) {
	return {
		denominator,
		numerator: numerator % denominator,
		whole: Math.floor(numerator / denominator),
	};
}

function formatMixedNumber(value: { denominator: number; numerator: number; whole: number }) {
	if (value.whole === 0) {
		return `${value.numerator}/${value.denominator}`;
	}

	if (value.numerator === 0) {
		return `${value.whole}`;
	}

	return `${value.whole} ${value.numerator}/${value.denominator}`;
}

function greatestCommonDivisor(left: number, right: number): number {
	let a = Math.abs(left);
	let b = Math.abs(right);
	while (b !== 0) {
		[a, b] = [b, a % b];
	}
	return a || 1;
}

type FractionType = "improper" | "mixed" | "proper";
