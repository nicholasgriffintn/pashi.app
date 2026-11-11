import { capitaliseFirst } from "./text.ts";

export class BudgetExceededError extends Error {}

export class InvalidIntegerError extends Error {}

export interface BudgetedIntegerOptions {
	fallback: number;
	label: string;
	max: number;
	min: number;
}

export function parseBudgetedInteger(
	input: string | undefined,
	{ fallback, label, max, min }: BudgetedIntegerOptions,
) {
	const value = input?.trim() ?? "";

	if (!value) {
		return fallback;
	}

	const parsed = /^[+-]?\d+$/.test(value) ? Number(value) : Number.NaN;

	if (!Number.isSafeInteger(parsed) || parsed < min) {
		throw new InvalidIntegerError(`Enter ${label} as a whole number of at least ${min}.`);
	}

	if (parsed > max) {
		throw new BudgetExceededError(`${capitaliseFirst(label)} can be at most ${max}.`);
	}

	return parsed;
}
