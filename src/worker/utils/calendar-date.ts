import { BudgetExceededError } from "./budget.ts";

export class CalendarDateError extends Error {}

export interface CalendarDate {
	day: number;
	month: number;
	year: number;
}

export interface CalendarDifference {
	days: number;
	months: number;
	totalDays: number;
	years: number;
}

export const WEEKDAY_NAMES = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
] as const;

const MILLISECONDS_PER_DAY = 86_400_000;
const DAY_OF_MONTH_SEARCH_MONTHS_PER_RESULT = 4;

export function daysInMonth(year: number, month: number) {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidCalendarDate({ day, month, year }: CalendarDate) {
	return (
		Number.isInteger(year) &&
		Number.isInteger(month) &&
		Number.isInteger(day) &&
		year >= 1 &&
		year <= 9999 &&
		month >= 1 &&
		month <= 12 &&
		day >= 1 &&
		day <= daysInMonth(year, month)
	);
}

export function parseCalendarDate(input: string, label = "date") {
	const value = input.trim();

	if (value.toLowerCase() === "today") {
		return calendarDateFromInstant(new Date());
	}

	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	const date = match
		? { day: Number(match[3]), month: Number(match[2]), year: Number(match[1]) }
		: undefined;

	if (!date || !isValidCalendarDate(date)) {
		throw new CalendarDateError(`Enter the ${label} as YYYY-MM-DD, for example 2027-01-06.`);
	}

	return date;
}

export function calendarDateFromInstant(date: Date): CalendarDate {
	return {
		day: date.getUTCDate(),
		month: date.getUTCMonth() + 1,
		year: date.getUTCFullYear(),
	};
}

export function toEpochDay({ day, month, year }: CalendarDate) {
	const date = new Date(0);

	date.setUTCFullYear(year, month - 1, day);

	return Math.round(date.getTime() / MILLISECONDS_PER_DAY);
}

export function fromEpochDay(epochDay: number) {
	return calendarDateFromInstant(new Date(epochDay * MILLISECONDS_PER_DAY));
}

export function formatCalendarDate({ day, month, year }: CalendarDate) {
	return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function weekdayOfEpochDay(epochDay: number) {
	return (((epochDay + 4) % 7) + 7) % 7;
}

export function weekdayName(epochDay: number) {
	return WEEKDAY_NAMES[weekdayOfEpochDay(epochDay)];
}

export function parseWeekday(input: string) {
	const value = input.trim().toLowerCase();

	if (/^[0-6]$/.test(value)) {
		return Number(value);
	}

	const index = WEEKDAY_NAMES.findIndex(
		(name) =>
			name.toLowerCase() === value || (value.length >= 3 && name.toLowerCase().startsWith(value)),
	);

	if (index < 0) {
		throw new CalendarDateError(
			`Unknown weekday "${input.trim()}". Use a name such as Friday or Fri, or 0 (Sunday) to 6 (Saturday).`,
		);
	}

	return index;
}

export function addCalendarMonths(date: CalendarDate, months: number): CalendarDate {
	const monthIndex = date.year * 12 + (date.month - 1) + months;
	const year = Math.floor(monthIndex / 12);
	const month = monthIndex - year * 12 + 1;

	return { day: Math.min(date.day, daysInMonth(year, month)), month, year };
}

export function calendarDifference(start: CalendarDate, end: CalendarDate): CalendarDifference {
	const startDay = toEpochDay(start);
	const endDay = toEpochDay(end);
	const sign = endDay < startDay ? -1 : 1;
	const earlier = sign === 1 ? start : end;
	const later = sign === 1 ? end : start;
	let months = later.year * 12 + later.month - (earlier.year * 12 + earlier.month);

	if (later.day < earlier.day) {
		months -= 1;
	}

	const days = toEpochDay(later) - toEpochDay(addCalendarMonths(earlier, months));
	const years = Math.floor(months / 12);

	return {
		days: signed(days, sign),
		months: signed(months - years * 12, sign),
		totalDays: endDay - startDay,
		years: signed(years, sign),
	};
}

export function nextWeekdays(from: CalendarDate, weekday: number, count: number) {
	const fromDay = toEpochDay(from);
	const first = fromDay + ((weekday - weekdayOfEpochDay(fromDay) + 6) % 7) + 1;

	return Array.from({ length: count }, (_, index) => first + index * 7);
}

export function nextDaysOfMonth(from: CalendarDate, dayOfMonth: number, count: number) {
	const results: number[] = [];
	const fromDay = toEpochDay(from);
	const monthBudget = count * DAY_OF_MONTH_SEARCH_MONTHS_PER_RESULT;

	for (let offset = 0; results.length < count; offset += 1) {
		if (offset > monthBudget) {
			throw new BudgetExceededError(
				`No ${count} occurrences of day ${dayOfMonth} found within ${monthBudget} months.`,
			);
		}

		const month = addCalendarMonths({ ...from, day: 1 }, offset);

		if (dayOfMonth > daysInMonth(month.year, month.month)) {
			continue;
		}

		const candidate = toEpochDay({ ...month, day: dayOfMonth });

		if (candidate > fromDay) {
			results.push(candidate);
		}
	}

	return results;
}

function signed(value: number, sign: number) {
	return value === 0 ? 0 : value * sign;
}
