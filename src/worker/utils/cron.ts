import { capitaliseFirst } from "./text";

export const CRON_SEARCH_HORIZON_YEARS = 28;

const CRON_SEARCH_HORIZON_DAYS = CRON_SEARCH_HORIZON_YEARS * 366;
const DAY_MS = 86_400_000;
const LIST_FORMAT = new Intl.ListFormat("en-GB", { style: "long", type: "conjunction" });

export class CronExpressionError extends Error {}

interface CronFieldSpec {
	displayNames?: readonly string[];
	label: string;
	max: number;
	min: number;
	names?: readonly string[];
	plural: string;
	size: number;
}

interface CronFieldItem {
	end: number;
	start: number;
	step: number;
}

export interface CronField {
	coversAll: boolean;
	items: readonly CronFieldItem[];
	spec: CronFieldSpec;
	startsWithWildcard: boolean;
	values: readonly number[];
}

export interface CronSchedule {
	dayOfMonth: CronField;
	dayOfWeek: CronField;
	expression: string;
	hour: CronField;
	minute: CronField;
	month: CronField;
}

const MINUTE: CronFieldSpec = { label: "minute", max: 59, min: 0, plural: "minutes", size: 60 };
const HOUR: CronFieldSpec = { label: "hour", max: 23, min: 0, plural: "hours", size: 24 };
const DAY_OF_MONTH: CronFieldSpec = {
	label: "day of month",
	max: 31,
	min: 1,
	plural: "days of month",
	size: 31,
};
const MONTH: CronFieldSpec = {
	displayNames: [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	],
	label: "month",
	max: 12,
	min: 1,
	names: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
	plural: "months",
	size: 12,
};
const DAY_OF_WEEK: CronFieldSpec = {
	displayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	label: "day of week",
	max: 7,
	min: 0,
	names: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
	plural: "days of week",
	size: 7,
};

export function parseCronExpression(input: string): CronSchedule {
	const fields = input.trim().split(/\s+/);

	if (fields.length !== 5) {
		throw new CronExpressionError(
			"Enter a standard five-field cron expression: minute, hour, day of month, month, day of week.",
		);
	}

	const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

	return {
		dayOfMonth: parseCronField(dayOfMonth, DAY_OF_MONTH),
		dayOfWeek: parseCronField(dayOfWeek, DAY_OF_WEEK),
		expression: fields.join(" "),
		hour: parseCronField(hour, HOUR),
		minute: parseCronField(minute, MINUTE),
		month: parseCronField(month, MONTH),
	};
}

export function nextCronRuns(schedule: CronSchedule, after: Date, count: number) {
	const runs: Date[] = [];
	const firstDay = Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), after.getUTCDate());

	for (let offset = 0; offset < CRON_SEARCH_HORIZON_DAYS && runs.length < count; offset += 1) {
		const day = new Date(firstDay + offset * DAY_MS);

		if (!matchesCronDay(schedule, day)) {
			continue;
		}

		for (const hour of schedule.hour.values) {
			for (const minute of schedule.minute.values) {
				const run = new Date(day.getTime() + (hour * 60 + minute) * 60_000);

				if (run.getTime() > after.getTime() && runs.length < count) {
					runs.push(run);
				}
			}
		}
	}

	return runs;
}

export function describeCronField(field: CronField) {
	const { items, spec } = field;

	if (!items.every((item) => item.start === item.end)) {
		return LIST_FORMAT.format(items.map((item) => describeCronItem(item, spec)));
	}

	const values = LIST_FORMAT.format(items.map((item) => cronValueLabel(item.start, spec)));

	if (spec.displayNames) {
		return values;
	}

	return `${items.length === 1 ? spec.label : spec.plural} ${values}`;
}

export function describeCronSchedule(schedule: CronSchedule) {
	const { hour, minute, month } = schedule;
	const isFixedTime = minute.values.length === 1 && hour.values.length === 1;
	const time = isFixedTime
		? `At ${twoDigits(hour.values[0])}:${twoDigits(minute.values[0])}`
		: cronTimePhrase(minute, hour);
	const days = cronDayPhrase(schedule) || (isFixedTime ? "every day" : "");
	const months = month.coversAll ? "" : `in ${describeCronField(month)}`;

	return [time, days, months].filter(Boolean).join(" ");
}

function parseCronField(source: string, spec: CronFieldSpec): CronField {
	const items = source.split(",").map((item) => parseCronItem(item, source, spec));
	const values = [
		...new Set(items.flatMap((item) => expandCronItem(item).map((value) => value % spec.size))),
	]
		.map((value) => (value < spec.min ? value + spec.size : value))
		.toSorted((left, right) => left - right);

	return {
		coversAll: values.length === spec.size,
		items,
		spec,
		startsWithWildcard: source.startsWith("*"),
		values,
	};
}

function parseCronItem(text: string, source: string, spec: CronFieldSpec): CronFieldItem {
	const invalid = (reason: string) =>
		new CronExpressionError(`Invalid ${spec.label} field "${source}": ${reason}.`);

	if (text === "") {
		throw invalid("a list item is empty");
	}

	const [rangeText, stepText, ...extraSteps] = text.split("/");

	if (extraSteps.length > 0) {
		throw invalid(`"${text}" has more than one step`);
	}

	const step = stepText === undefined ? 1 : parseCronNumber(stepText);

	if (step === undefined || step < 1) {
		throw invalid(`step "${stepText}" must be a whole number of 1 or more`);
	}

	if (rangeText === "*") {
		return { end: spec.max, start: spec.min, step };
	}

	const [startText, endText, ...extraBounds] = rangeText.split("-");

	if (extraBounds.length > 0) {
		throw invalid(`"${rangeText}" is not a valid range`);
	}

	const bound = (value: string) => {
		const parsed = parseCronValue(value, spec);

		if (parsed === undefined) {
			throw invalid(`"${value}" is not a value between ${spec.min} and ${spec.max}`);
		}

		return parsed;
	};

	const start = bound(startText);
	const openEnd = stepText === undefined ? start : spec.max;
	const closedEnd = endText === undefined ? openEnd : bound(endText);
	const isAliasedMinimum = closedEnd === spec.min && spec.max - spec.min === spec.size;
	const end = start > closedEnd && isAliasedMinimum ? spec.max : closedEnd;

	if (start > end) {
		throw invalid(`range "${rangeText}" is reversed`);
	}

	return { end, start, step };
}

function parseCronNumber(text: string) {
	return /^\d{1,4}$/.test(text) ? Number.parseInt(text, 10) : undefined;
}

function parseCronValue(text: string, spec: CronFieldSpec) {
	const nameIndex = spec.names?.indexOf(text.toUpperCase()) ?? -1;
	const value = nameIndex >= 0 ? nameIndex + spec.min : parseCronNumber(text);

	return value !== undefined && value >= spec.min && value <= spec.max ? value : undefined;
}

function expandCronItem({ end, start, step }: CronFieldItem) {
	const values: number[] = [];

	for (let value = start; value <= end; value += step) {
		values.push(value);
	}

	return values;
}

function usesEitherDayRule({ dayOfMonth, dayOfWeek }: CronSchedule) {
	return !dayOfMonth.startsWithWildcard && !dayOfWeek.startsWithWildcard;
}

function matchesCronDay(schedule: CronSchedule, day: Date) {
	if (!schedule.month.values.includes(day.getUTCMonth() + 1)) {
		return false;
	}

	const matchesDayOfMonth = schedule.dayOfMonth.values.includes(day.getUTCDate());
	const matchesDayOfWeek = schedule.dayOfWeek.values.includes(day.getUTCDay());

	return usesEitherDayRule(schedule)
		? matchesDayOfMonth || matchesDayOfWeek
		: matchesDayOfMonth && matchesDayOfWeek;
}

function isFullCronRange(item: CronFieldItem, spec: CronFieldSpec) {
	return item.start === spec.min && item.end === spec.max;
}

function isRecurringCronField(field: CronField) {
	return field.items.every((item) => item.step > 1 || isFullCronRange(item, field.spec));
}

function cronValueLabel(value: number, spec: CronFieldSpec) {
	return spec.displayNames?.[(value - spec.min) % spec.size] ?? `${value}`;
}

function describeCronItem(item: CronFieldItem, spec: CronFieldSpec) {
	const isFullRange = isFullCronRange(item, spec);
	const range = `${cronValueLabel(item.start, spec)} to ${cronValueLabel(item.end, spec)}`;

	if (item.step > 1) {
		return `every ${item.step} ${spec.plural}${isFullRange ? "" : ` from ${range}`}`;
	}

	if (isFullRange) {
		return `every ${spec.label}`;
	}

	if (item.start === item.end) {
		const value = cronValueLabel(item.start, spec);

		return spec.displayNames ? value : `${spec.label} ${value}`;
	}

	return spec.displayNames ? range : `${spec.plural} ${range}`;
}

function cronTimePhrase(minute: CronField, hour: CronField) {
	const isRecurringMinute = isRecurringCronField(minute);
	const minuteText = describeCronField(minute);
	const lead = isRecurringMinute ? capitaliseFirst(minuteText) : `At ${minuteText}`;

	if (hour.coversAll) {
		return isRecurringMinute ? lead : `${lead} of every hour`;
	}

	return `${lead} ${isRecurringCronField(hour) ? "of" : "during"} ${describeCronField(hour)}`;
}

function cronDayPhrase(schedule: CronSchedule) {
	const { dayOfMonth, dayOfWeek } = schedule;
	const isEither = usesEitherDayRule(schedule);

	if (isEither && (dayOfMonth.coversAll || dayOfWeek.coversAll)) {
		return "";
	}

	const phrases = [dayOfMonth, dayOfWeek]
		.filter((field) => !field.coversAll)
		.map((field) => describeCronField(field));

	if (phrases.length < 2) {
		return phrases.length === 1 ? `on ${phrases[0]}` : "";
	}

	return isEither
		? `on ${phrases[0]} or on ${phrases[1]}`
		: `on ${phrases[0]}, only when also ${phrases[1]}`;
}

function twoDigits(value: number) {
	return `${value}`.padStart(2, "0");
}
