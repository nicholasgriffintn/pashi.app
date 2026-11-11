import {
	BudgetExceededError,
	InvalidIntegerError,
	parseBudgetedInteger,
} from "../../utils/budget.ts";
import {
	CalendarDateError,
	formatCalendarDate,
	fromEpochDay,
	parseCalendarDate,
	parseWeekday,
	toEpochDay,
	WEEKDAY_NAMES,
	weekdayName,
} from "../../utils/calendar-date.ts";
import { parseDelimitedList } from "../../utils/generation.ts";
import {
	addWorkingDays,
	assertCovered,
	countWorkingDays,
	holidaysBetween,
	isWeekend,
	isWorkingDay,
	type WorkingCalendar,
	WorkingCalendarRangeError,
} from "../../utils/working-days.ts";
import {
	UK_BANK_HOLIDAY_LICENCE,
	UK_BANK_HOLIDAY_REGIONS,
	UK_BANK_HOLIDAY_SOURCE,
	UK_BANK_HOLIDAYS,
	type UkBankHoliday,
	type UkBankHolidayRegion,
} from "../generators/data/uk-bank-holidays.ts";

export const WORKING_DAYS_FORMATS = [
	"add",
	"subtract",
	"count",
	"is-bank-holiday",
	"next-bank-holiday",
] as const;

export type WorkingDaysFormat = (typeof WORKING_DAYS_FORMATS)[number];

export const WORKING_DAYS_REGIONS = [...UK_BANK_HOLIDAY_REGIONS, "none"] as const;
export const WORKING_DAYS_DEFAULT_REGION: UkBankHolidayRegion = "england-and-wales";
export const WORKING_DAYS_DEFAULT_WEEKEND = "sat,sun";
export const WORKING_DAYS_MAX_AMOUNT = 1000;
export const WORKING_DAYS_MAX_RESULTS = 12;
export const UK_BANK_HOLIDAY_FIRST_DATE = "2019-01-01";
export const UK_BANK_HOLIDAY_LAST_DATE = "2028-12-31";

const MAX_COUNT_SPAN_DAYS = 36_525;
const MAX_EXTRA_HOLIDAYS = 366;
const EXTRA_HOLIDAY_TITLE = "Extra holiday";
const BUNDLED_COVERAGE = {
	firstDay: toEpochDay(parseCalendarDate(UK_BANK_HOLIDAY_FIRST_DATE)),
	lastDay: toEpochDay(parseCalendarDate(UK_BANK_HOLIDAY_LAST_DATE)),
};
const regionHolidayCache = new Map<UkBankHolidayRegion, ReadonlyMap<number, UkBankHoliday>>();

export class WorkingDaysError extends Error {
	readonly status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.status = status;
	}
}

interface WorkingDaysContext {
	calendar: WorkingCalendar;
	extraHolidays: ReadonlySet<number>;
	region: UkBankHolidayRegion | undefined;
	regionHolidays: ReadonlyMap<number, UkBankHoliday>;
	weekend: readonly number[];
}

export function isWorkingDaysFormat(value: string): value is WorkingDaysFormat {
	return WORKING_DAYS_FORMATS.some((format) => format === value);
}

export function calculateWorkingDays(
	input: string,
	format: WorkingDaysFormat,
	fields: Record<string, string>,
) {
	try {
		return JSON.stringify(runWorkingDays(input, format, fields), null, 2);
	} catch (error) {
		if (error instanceof WorkingCalendarRangeError) {
			throw new WorkingDaysError(
				`${formatCalendarDate(fromEpochDay(error.epochDay))} is outside the bundled UK bank holiday data (${UK_BANK_HOLIDAY_FIRST_DATE} to ${UK_BANK_HOLIDAY_LAST_DATE}). Use region=none with your own holidays for other dates.`,
				422,
			);
		}

		if (error instanceof BudgetExceededError) {
			throw new WorkingDaysError(error.message, 422);
		}

		if (error instanceof CalendarDateError || error instanceof InvalidIntegerError) {
			throw new WorkingDaysError(error.message);
		}

		throw error;
	}
}

function runWorkingDays(input: string, format: WorkingDaysFormat, fields: Record<string, string>) {
	const context = workingDaysContext(fields);
	const startDay = toEpochDay(parseCalendarDate(input));

	assertCovered(context.calendar, startDay);

	return WORKING_DAYS_MODES[format](context, startDay, fields);
}

function workingDaysContext(fields: Record<string, string>): WorkingDaysContext {
	const region = parseRegion(fields.region);
	const regionHolidays = region ? holidaysForRegion(region) : new Map<number, UkBankHoliday>();
	const extraHolidays = parseExtraHolidays(fields.holidays);
	const weekend = parseWeekend(fields.weekend);

	return {
		calendar: {
			...(region ? { coverage: BUNDLED_COVERAGE } : {}),
			holidays: new Set([...regionHolidays.keys(), ...extraHolidays]),
			weekend: new Set(weekend),
		},
		extraHolidays,
		region,
		regionHolidays,
		weekend,
	};
}

function parseRegion(input: string | undefined) {
	const value = input?.trim().toLowerCase() || WORKING_DAYS_DEFAULT_REGION;

	if (value === "none") {
		return undefined;
	}

	const region = UK_BANK_HOLIDAY_REGIONS.find((candidate) => candidate === value);

	if (!region) {
		throw new WorkingDaysError(`Choose a region: ${WORKING_DAYS_REGIONS.join(", ")}.`);
	}

	return region;
}

function holidaysForRegion(region: UkBankHolidayRegion) {
	let holidays = regionHolidayCache.get(region);

	if (!holidays) {
		holidays = new Map(
			UK_BANK_HOLIDAYS[region].map((holiday) => [
				toEpochDay(parseCalendarDate(holiday.date)),
				holiday,
			]),
		);
		regionHolidayCache.set(region, holidays);
	}

	return holidays;
}

function parseWeekend(input: string | undefined) {
	const names = parseDelimitedList(input?.trim() || WORKING_DAYS_DEFAULT_WEEKEND);
	const weekend = [...new Set(names.map(parseWeekday))].toSorted((left, right) => left - right);

	if (weekend.length >= WEEKDAY_NAMES.length) {
		throw new WorkingDaysError("The weekend cannot cover all seven days.");
	}

	return weekend;
}

function parseExtraHolidays(input: string | undefined) {
	const dates = parseDelimitedList(input ?? "");

	if (dates.length > MAX_EXTRA_HOLIDAYS) {
		throw new WorkingDaysError(`Add at most ${MAX_EXTRA_HOLIDAYS} extra holidays.`, 422);
	}

	return new Set(dates.map((date) => toEpochDay(parseCalendarDate(date, "extra holiday"))));
}

function holidayEntry(context: WorkingDaysContext, epochDay: number) {
	const holiday = context.regionHolidays.get(epochDay);

	return {
		date: formatCalendarDate(fromEpochDay(epochDay)),
		weekday: weekdayName(epochDay),
		title: holiday?.title ?? EXTRA_HOLIDAY_TITLE,
		...(holiday?.notes ? { notes: holiday.notes } : {}),
	};
}

function describeCalendar(context: WorkingDaysContext) {
	return {
		region: context.region ?? "none",
		weekend: context.weekend.map((day) => WEEKDAY_NAMES[day]),
		...(context.extraHolidays.size > 0
			? {
					extraHolidays: [...context.extraHolidays]
						.toSorted((left, right) => left - right)
						.map((day) => formatCalendarDate(fromEpochDay(day))),
				}
			: {}),
	};
}

function attribution(context: WorkingDaysContext) {
	return context.region ? { licence: UK_BANK_HOLIDAY_LICENCE, source: UK_BANK_HOLIDAY_SOURCE } : {};
}

function requireRegion(context: WorkingDaysContext) {
	if (!context.region) {
		throw new WorkingDaysError(
			`Choose a UK region for bank holidays: ${UK_BANK_HOLIDAY_REGIONS.join(", ")}.`,
		);
	}

	return context.region;
}

function shiftWorkingDays(
	context: WorkingDaysContext,
	startDay: number,
	fields: Record<string, string>,
	direction: 1 | -1,
) {
	const amount = parseBudgetedInteger(fields.amount, {
		fallback: 1,
		label: "amount",
		max: WORKING_DAYS_MAX_AMOUNT,
		min: 0,
	});
	const resultDay = addWorkingDays(context.calendar, startDay, amount * direction);
	const [firstDay, lastDay] =
		direction === 1 ? [startDay + 1, resultDay] : [resultDay, startDay - 1];

	return {
		from: formatCalendarDate(fromEpochDay(startDay)),
		fromWeekday: weekdayName(startDay),
		amount,
		direction: direction === 1 ? "forwards" : "backwards",
		date: formatCalendarDate(fromEpochDay(resultDay)),
		weekday: weekdayName(resultDay),
		holidaysSkipped: holidaysBetween(context.calendar, firstDay, lastDay).map((day) =>
			holidayEntry(context, day),
		),
		note: "The start date is not counted: the result is the Nth working day after (or before) it. An amount of 0 returns the start date unchanged.",
		...describeCalendar(context),
		...attribution(context),
	};
}

function countBetween(
	context: WorkingDaysContext,
	startDay: number,
	fields: Record<string, string>,
) {
	const untilInput = fields.until ?? fields.end ?? "";

	if (!untilInput.trim()) {
		throw new WorkingDaysError("Enter an until date as YYYY-MM-DD.");
	}

	const endDay = toEpochDay(parseCalendarDate(untilInput, "until date"));
	const sign = endDay < startDay ? -1 : 1;
	const count = countWorkingDays(
		context.calendar,
		Math.min(startDay, endDay),
		Math.max(startDay, endDay),
		MAX_COUNT_SPAN_DAYS,
	);

	return {
		from: formatCalendarDate(fromEpochDay(startDay)),
		until: formatCalendarDate(fromEpochDay(endDay)),
		workingDays: count.workingDays === 0 ? 0 : count.workingDays * sign,
		calendarDays: count.calendarDays,
		weekendDays: count.weekendDays,
		holidays: count.holidays.map((day) => holidayEntry(context, day)),
		inclusive:
			"Both ends are inclusive: the start and until dates count when they are working days. The count is negative when until is earlier.",
		...describeCalendar(context),
		...attribution(context),
	};
}

const WORKING_DAYS_MODES: Record<
	WorkingDaysFormat,
	(context: WorkingDaysContext, startDay: number, fields: Record<string, string>) => object
> = {
	add: (context, startDay, fields) => shiftWorkingDays(context, startDay, fields, 1),
	count: countBetween,
	"is-bank-holiday": (context, startDay) => bankHolidayCheck(context, startDay),
	"next-bank-holiday": nextBankHolidays,
	subtract: (context, startDay, fields) => shiftWorkingDays(context, startDay, fields, -1),
};

function bankHolidayCheck(context: WorkingDaysContext, epochDay: number) {
	const region = requireRegion(context);
	const holiday = context.regionHolidays.get(epochDay);

	return {
		date: formatCalendarDate(fromEpochDay(epochDay)),
		weekday: weekdayName(epochDay),
		region,
		bankHoliday: Boolean(holiday),
		...(holiday ? { title: holiday.title } : {}),
		...(holiday?.notes ? { notes: holiday.notes } : {}),
		workingDay: isWorkingDay(context.calendar, epochDay),
		weekend: isWeekend(context.calendar, epochDay),
		licence: UK_BANK_HOLIDAY_LICENCE,
		source: UK_BANK_HOLIDAY_SOURCE,
	};
}

function nextBankHolidays(
	context: WorkingDaysContext,
	startDay: number,
	fields: Record<string, string>,
) {
	const region = requireRegion(context);
	const count = parseBudgetedInteger(fields.count, {
		fallback: 1,
		label: "count",
		max: WORKING_DAYS_MAX_RESULTS,
		min: 1,
	});
	const upcoming = [...context.regionHolidays.keys()]
		.filter((day) => day >= startDay)
		.toSorted((left, right) => left - right)
		.slice(0, count);

	return {
		from: formatCalendarDate(fromEpochDay(startDay)),
		region,
		bankHolidays: upcoming.map((day) => ({
			...holidayEntry(context, day),
			daysAway: day - startDay,
		})),
		note:
			upcoming.length < count
				? `Only ${upcoming.length} bundled bank holidays fall on or after this date; the data ends on ${UK_BANK_HOLIDAY_LAST_DATE}.`
				: "Includes the start date when it is a bank holiday.",
		licence: UK_BANK_HOLIDAY_LICENCE,
		source: UK_BANK_HOLIDAY_SOURCE,
	};
}
