import {
	BudgetExceededError,
	InvalidIntegerError,
	parseBudgetedInteger,
} from "../../utils/budget.ts";
import {
	type CalendarDate,
	CalendarDateError,
	calendarDateFromInstant,
	calendarDifference,
	formatCalendarDate,
	fromEpochDay,
	nextDaysOfMonth,
	nextWeekdays,
	parseWeekday,
	toEpochDay,
	WEEKDAY_NAMES,
	weekdayName,
} from "../../utils/calendar-date.ts";
import {
	formatWallTime,
	parseIsoDateTime,
	resolveTimeZone,
	resolveWallTime,
	TimeZoneError,
	type WallTime,
	wallTimeAsUtc,
	zonedView,
} from "../../utils/time-zone.ts";

export type TimestampTransformFormat =
	| "add"
	| "calendar-difference"
	| "convert-zone"
	| "difference"
	| "discord"
	| "iso"
	| "milliseconds"
	| "next-occurrence"
	| "now-in-zone"
	| "readable"
	| "rfc2822"
	| "subtract"
	| "unix";

export const TIMESTAMP_TRANSFORM_FORMATS: readonly TimestampTransformFormat[] = [
	"unix",
	"milliseconds",
	"iso",
	"readable",
	"rfc2822",
	"discord",
	"add",
	"subtract",
	"difference",
	"calendar-difference",
	"next-occurrence",
	"convert-zone",
	"now-in-zone",
];

export const TIMESTAMP_JSON_FORMATS: readonly TimestampTransformFormat[] = [
	"calendar-difference",
	"convert-zone",
	"difference",
	"next-occurrence",
	"now-in-zone",
];

export const TIMESTAMP_MAX_OCCURRENCES = 12;

export class TimestampTransformError extends Error {
	readonly status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.status = status;
	}
}

const UNIT_MILLISECONDS: Record<string, number> = {
	day: 86_400_000,
	days: 86_400_000,
	hour: 3_600_000,
	hours: 3_600_000,
	millisecond: 1,
	milliseconds: 1,
	minute: 60_000,
	minutes: 60_000,
	second: 1000,
	seconds: 1000,
	week: 604_800_000,
	weeks: 604_800_000,
};
const DISCORD_STYLES: Record<string, string> = {
	date: "D",
	full: "F",
	longdate: "D",
	longtime: "T",
	relative: "R",
	shortdate: "d",
	shorttime: "t",
};
const CALENDAR_DIFFERENCE_NOTE =
	"Whole months count only once the day of the month is reached, as java.time Period.between does: 31 January to 28 February is 0 months and 28 days. Dates are taken in UTC. When until is earlier, every value is negative and the earlier date anchors the count.";

type ZonedInput =
	| { epochMs: number; kind: "instant"; offset?: string }
	| { kind: "local"; wall: WallTime };

export function isTimestampTransformFormat(value: string): value is TimestampTransformFormat {
	return TIMESTAMP_TRANSFORM_FORMATS.some((format) => format === value);
}

export function transformTimestamp(
	input: string,
	format: TimestampTransformFormat,
	fields: Record<string, string>,
) {
	try {
		return TIMESTAMP_TRANSFORMS[format](input, fields);
	} catch (error) {
		if (error instanceof BudgetExceededError) {
			throw new TimestampTransformError(error.message, 422);
		}

		if (
			error instanceof CalendarDateError ||
			error instanceof InvalidIntegerError ||
			error instanceof TimeZoneError
		) {
			throw new TimestampTransformError(error.message);
		}

		throw error;
	}
}

const TIMESTAMP_TRANSFORMS: Record<
	TimestampTransformFormat,
	(input: string, fields: Record<string, string>) => string
> = {
	add: (input, fields) => addTime(parseTimestamp(input), fields, 1).toISOString(),
	"calendar-difference": calendarDifferenceJson,
	"convert-zone": convertZone,
	difference: (input, fields) => timestampDifference(parseTimestamp(input), parseUntil(fields)),
	discord: (input, fields) => discordTimestamp(parseTimestamp(input), fields.style),
	iso: (input) => parseTimestamp(input).toISOString(),
	milliseconds: (input) => `${parseTimestamp(input).getTime()}`,
	"next-occurrence": nextOccurrence,
	"now-in-zone": (_input, fields) => nowInZone(fields),
	readable: (input) => parseTimestamp(input).toUTCString(),
	rfc2822: (input) => formatRfc2822(parseTimestamp(input)),
	subtract: (input, fields) => addTime(parseTimestamp(input), fields, -1).toISOString(),
	unix: (input) => `${Math.floor(parseTimestamp(input).getTime() / 1000)}`,
};

function parseTimestamp(input: string) {
	const value = input.trim();

	if (!value) {
		throw new TimestampTransformError("Enter a timestamp or date.");
	}

	if (value.toLowerCase() === "now") {
		return new Date();
	}

	if (/^-?\d+$/.test(value)) {
		const numeric = Number(value);
		const milliseconds = Math.abs(numeric) < 10_000_000_000 ? numeric * 1000 : numeric;

		return validDate(new Date(milliseconds));
	}

	return validDate(new Date(value));
}

function parseUntil(fields: Record<string, string>) {
	const until = fields.until ?? fields.end ?? "";

	if (!until.trim()) {
		throw new TimestampTransformError("Enter an until timestamp or date.");
	}

	return parseTimestamp(until);
}

function validDate(date: Date) {
	if (Number.isNaN(date.getTime())) {
		throw new TimestampTransformError("Enter a valid timestamp or date.");
	}

	return date;
}

function addTime(date: Date, fields: Record<string, string>, direction: 1 | -1) {
	const amount = Number.parseFloat(fields.amount ?? "1");
	const unit = UNIT_MILLISECONDS[(fields.unit ?? "days").trim().toLowerCase()];

	if (!Number.isFinite(amount) || !unit) {
		throw new TimestampTransformError("Enter a numeric amount and supported unit.");
	}

	return new Date(date.getTime() + direction * amount * unit);
}

function timestampDifference(start: Date, end: Date) {
	const milliseconds = Math.abs(end.getTime() - start.getTime());
	const seconds = Math.floor(milliseconds / 1000);

	return JSON.stringify(
		{
			days: Math.floor(seconds / 86_400),
			hours: Math.floor(seconds / 3600),
			milliseconds,
			minutes: Math.floor(seconds / 60),
			seconds,
		},
		null,
		2,
	);
}

function calendarDifferenceJson(input: string, fields: Record<string, string>) {
	const start = calendarDateFromInstant(parseTimestamp(input));
	const end = calendarDateFromInstant(parseUntil(fields));
	const difference = calendarDifference(start, end);

	return JSON.stringify(
		{
			from: formatCalendarDate(start),
			until: formatCalendarDate(end),
			years: difference.years,
			months: difference.months,
			days: difference.days,
			totalDays: difference.totalDays,
			direction:
				difference.totalDays < 0 ? "backwards" : difference.totalDays > 0 ? "forwards" : "same day",
			note: CALENDAR_DIFFERENCE_NOTE,
		},
		null,
		2,
	);
}

function nextOccurrence(input: string, fields: Record<string, string>) {
	const from = calendarDateFromInstant(parseTimestamp(input));
	const weekdayInput = fields.weekday?.trim() ?? "";
	const dayOfMonthInput = fields.dayOfMonth?.trim() ?? "";

	if (Boolean(weekdayInput) === Boolean(dayOfMonthInput)) {
		throw new TimestampTransformError("Enter either a weekday or a dayOfMonth, not both.");
	}

	const count = parseBudgetedInteger(fields.count, {
		fallback: 1,
		label: "count",
		max: TIMESTAMP_MAX_OCCURRENCES,
		min: 1,
	});
	const occurrence = weekdayInput
		? weekdayOccurrences(from, parseWeekday(weekdayInput), count)
		: dayOfMonthOccurrences(from, parseDayOfMonth(dayOfMonthInput), count);

	return JSON.stringify(
		{
			from: formatCalendarDate(from),
			rule: occurrence.rule,
			occurrences: occurrence.days.map((day) => ({
				date: formatCalendarDate(fromEpochDay(day)),
				weekday: weekdayName(day),
				daysAway: day - toEpochDay(from),
			})),
			note: occurrence.note,
		},
		null,
		2,
	);
}

function weekdayOccurrences(from: CalendarDate, weekday: number, count: number) {
	return {
		days: nextWeekdays(from, weekday, count),
		note: "Occurrences start after the input date (UTC), so the same weekday means a week later.",
		rule: WEEKDAY_NAMES[weekday],
	};
}

function dayOfMonthOccurrences(from: CalendarDate, dayOfMonth: number, count: number) {
	return {
		days: nextDaysOfMonth(from, dayOfMonth, count),
		note: "Occurrences start after the input date (UTC). Months without that day are skipped.",
		rule: `day ${dayOfMonth} of the month`,
	};
}

function parseDayOfMonth(input: string) {
	const day = /^\d{1,2}$/.test(input) ? Number(input) : Number.NaN;

	if (!(day >= 1 && day <= 31)) {
		throw new TimestampTransformError("Enter dayOfMonth as a whole number from 1 to 31.");
	}

	return day;
}

function parseZonedInput(input: string): ZonedInput {
	const value = input.trim();
	const parsed = parseIsoDateTime(value);

	if (!parsed) {
		return { epochMs: parseTimestamp(value).getTime(), kind: "instant" };
	}

	if (parsed.offset === undefined) {
		return { kind: "local", wall: parsed.wall };
	}

	return {
		epochMs: wallTimeAsUtc(parsed.wall) - parsed.offset.milliseconds,
		kind: "instant",
		offset: parsed.offset.text,
	};
}

function convertZone(input: string, fields: Record<string, string>) {
	const toZone = resolveTimeZone(fields.toZone, "toZone");
	const fromZone = resolveTimeZone(fields.fromZone?.trim() || "UTC", "fromZone");
	const parsed = parseZonedInput(input);

	if (parsed.kind === "instant") {
		return zoneConversionJson(input, parsed.epochMs, fromZone, toZone, {
			resolution: "absolute",
			...(parsed.offset ? { inputOffset: parsed.offset } : {}),
			...(fields.fromZone?.trim()
				? { note: "The input carries its own offset, so fromZone only sets the display zone." }
				: {}),
		});
	}

	const resolved = resolveWallTime(parsed.wall, fromZone);
	const requested = formatWallTime(parsed.wall);

	if (resolved.resolution === "non-existent") {
		const shifted = zonedView(resolved.epochMs, fromZone);

		return zoneConversionJson(input, resolved.epochMs, fromZone, toZone, {
			resolution: "non-existent-shifted-forward",
			note: `${requested} does not exist in ${fromZone} because the clocks went forward. It was shifted forward to ${shifted.localTime} (${shifted.offset}).`,
		});
	}

	if (resolved.resolution === "ambiguous" && resolved.alternativeEpochMs !== undefined) {
		const earlier = zonedView(resolved.epochMs, fromZone);
		const later = zonedView(resolved.alternativeEpochMs, fromZone);
		const laterUtc = new Date(resolved.alternativeEpochMs).toISOString();

		return zoneConversionJson(input, resolved.epochMs, fromZone, toZone, {
			resolution: "ambiguous-earlier-chosen",
			laterUtc,
			note: `${requested} happened twice in ${fromZone} because the clocks went back. The earlier instant (${earlier.offset}) was used; the later one (${later.offset}) is ${laterUtc}.`,
		});
	}

	return zoneConversionJson(input, resolved.epochMs, fromZone, toZone, { resolution: "exact" });
}

function zoneConversionJson(
	input: string,
	epochMs: number,
	fromZone: string,
	toZone: string,
	details: Record<string, string>,
) {
	return JSON.stringify(
		{
			input: input.trim(),
			utc: new Date(epochMs).toISOString(),
			unix: Math.floor(epochMs / 1000),
			from: zonedView(epochMs, fromZone),
			to: zonedView(epochMs, toZone),
			...details,
		},
		null,
		2,
	);
}

function nowInZone(fields: Record<string, string>) {
	const toZone = resolveTimeZone(fields.toZone, "toZone");
	const epochMs = Date.now();

	return JSON.stringify(
		{
			utc: new Date(epochMs).toISOString(),
			unix: Math.floor(epochMs / 1000),
			to: zonedView(epochMs, toZone),
		},
		null,
		2,
	);
}

function discordTimestamp(date: Date, styleInput: string | undefined) {
	const style = DISCORD_STYLES[(styleInput ?? "full").trim().toLowerCase()] ?? "F";

	return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

function formatRfc2822(date: Date) {
	return date.toUTCString().replace("GMT", "+0000");
}
