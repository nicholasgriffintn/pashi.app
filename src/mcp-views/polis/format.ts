import { formatCompactCount } from "../shared/numbers";
import { YEAR_DAYS } from "./library/index";

export function formatMoment(day: number, hour?: number): string {
	const date = `Year ${Math.floor(day / YEAR_DAYS) + 1} · Day ${(day % YEAR_DAYS) + 1}`;

	return hour === undefined ? date : `${date} · ${String(hour).padStart(2, "0")}:00`;
}

export function formatPercent(value: number): string {
	return `${value.toFixed(1)}%`;
}

export function formatMoney(value: number): string {
	return `£${formatCompactCount(Math.round(value))}`;
}

export function formatCount(value: number): string {
	return formatCompactCount(Math.round(value));
}

export function yearOf(day: number): number {
	return Math.floor(day / YEAR_DAYS) + 1;
}
