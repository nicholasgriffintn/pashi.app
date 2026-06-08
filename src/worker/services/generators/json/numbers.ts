import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import {
	parseInteger,
	parseNumber,
	randomIntegerInRange,
	randomUnitInterval,
} from "../../../utils/generation";
import { fieldsResult, textResult } from "./result";

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
		case "octal-number":
			return textResult(generator, request.input, createBaseNumber(request, 8));
		default:
			return undefined;
	}
}

function createNumbers(request: GeneratorRequest) {
	const mode = request.fields.mode === "decimal" ? "decimal" : "integer";
	const count = parseInteger(request.fields.count ?? "", 1, 1, 1000);
	const values = Array.from({ length: count }, () =>
		mode === "decimal" ? createDecimal(request) : `${createInteger(request)}`,
	);
	return values.length === 1 ? values[0] : values;
}

function createInteger(request: GeneratorRequest) {
	const min = parseInteger(request.fields.min ?? "", 1, -1_000_000_000, 1_000_000_000);
	const max = parseInteger(request.fields.max ?? "", 100, -1_000_000_000, 1_000_000_000);
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	return lower + randomIntegerInRange(upper - lower + 1);
}

function createDecimal(request: GeneratorRequest) {
	const min = parseNumber(request.fields.min ?? "", 0, -1_000_000_000, 1_000_000_000);
	const max = parseNumber(request.fields.max ?? "", 1, -1_000_000_000, 1_000_000_000);
	const decimals = parseInteger(request.fields.decimals ?? "", 4, 0, 12);
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	return (lower + randomUnitInterval() * (upper - lower)).toFixed(decimals);
}

function createBaseNumber(request: GeneratorRequest, base: 8 | 16) {
	const min = parseInteger(request.fields.min ?? "", 0, 0, 1_000_000_000);
	const max = parseInteger(request.fields.max ?? "", 65_535, 0, 1_000_000_000);
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	const value = lower + randomIntegerInRange(upper - lower + 1);
	const prefix = base === 16 ? "0x" : "0o";
	return `${prefix}${value.toString(base).toUpperCase()}`;
}

function createFraction(request: GeneratorRequest) {
	const maxDenominator = parseInteger(request.fields.maxDenominator ?? "", 12, 2, 10_000);
	const denominator = randomIntegerInRange(maxDenominator - 1) + 2;
	const numerator = randomIntegerInRange(denominator + 1);
	const divisor = greatestCommonDivisor(numerator, denominator);
	const simplifiedNumerator = numerator / divisor;
	const simplifiedDenominator = denominator / divisor;

	return {
		decimal: `${simplifiedNumerator / simplifiedDenominator}`,
		fraction: `${simplifiedNumerator}/${simplifiedDenominator}`,
		numerator: `${simplifiedNumerator}`,
		denominator: `${simplifiedDenominator}`,
	};
}

function greatestCommonDivisor(left: number, right: number): number {
	let a = Math.abs(left);
	let b = Math.abs(right);
	while (b !== 0) {
		[a, b] = [b, a % b];
	}
	return a || 1;
}
