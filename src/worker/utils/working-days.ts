import { BudgetExceededError } from "./budget.ts";
import { weekdayOfEpochDay } from "./calendar-date.ts";

export class WorkingCalendarRangeError extends Error {
	readonly epochDay: number;

	constructor(epochDay: number) {
		super("Date is outside the holiday calendar's coverage.");
		this.epochDay = epochDay;
	}
}

export interface WorkingCalendar {
	coverage?: { firstDay: number; lastDay: number };
	holidays: ReadonlySet<number>;
	weekend: ReadonlySet<number>;
}

export interface WorkingDayCount {
	calendarDays: number;
	holidays: number[];
	weekendDays: number;
	workingDays: number;
}

export function assertCovered(calendar: WorkingCalendar, epochDay: number) {
	const { coverage } = calendar;

	if (coverage && (epochDay < coverage.firstDay || epochDay > coverage.lastDay)) {
		throw new WorkingCalendarRangeError(epochDay);
	}
}

export function isWeekend(calendar: WorkingCalendar, epochDay: number) {
	return calendar.weekend.has(weekdayOfEpochDay(epochDay));
}

export function isWorkingDay(calendar: WorkingCalendar, epochDay: number) {
	assertCovered(calendar, epochDay);

	return !isWeekend(calendar, epochDay) && !calendar.holidays.has(epochDay);
}

export function holidaysBetween(calendar: WorkingCalendar, firstDay: number, lastDay: number) {
	return [...calendar.holidays]
		.filter((day) => day >= firstDay && day <= lastDay && !isWeekend(calendar, day))
		.toSorted((left, right) => left - right);
}

export function addWorkingDays(calendar: WorkingCalendar, startDay: number, amount: number) {
	const direction = amount < 0 ? -1 : 1;
	const stepBudget = (Math.abs(amount) + 1) * 7 + calendar.holidays.size;
	let remaining = Math.abs(amount);
	let day = startDay;

	for (let steps = 1; remaining > 0; steps += 1) {
		if (steps > stepBudget) {
			throw new BudgetExceededError(`No working day found within ${stepBudget} days.`);
		}

		day += direction;

		if (isWorkingDay(calendar, day)) {
			remaining -= 1;
		}
	}

	return day;
}

export function countWorkingDays(
	calendar: WorkingCalendar,
	firstDay: number,
	lastDay: number,
	maxSpanDays: number,
): WorkingDayCount {
	const calendarDays = lastDay - firstDay + 1;

	if (calendarDays > maxSpanDays) {
		throw new BudgetExceededError(`Count working days across at most ${maxSpanDays} days.`);
	}

	let workingDays = 0;
	let weekendDays = 0;

	for (let day = firstDay; day <= lastDay; day += 1) {
		if (isWorkingDay(calendar, day)) {
			workingDays += 1;
		} else if (isWeekend(calendar, day)) {
			weekendDays += 1;
		}
	}

	return {
		calendarDays,
		holidays: holidaysBetween(calendar, firstDay, lastDay),
		weekendDays,
		workingDays,
	};
}
