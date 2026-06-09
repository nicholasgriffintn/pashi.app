import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import {
	parseBoolean,
	parseChoice,
	parseCount,
	parseInteger,
	randomDateInRange,
	randomIntegerBetween,
	randomIntegerInRange,
	singleOrList,
} from "../../../utils/generation";
import { fieldsResult, textResult } from "./result";

const DEFAULT_START_DATE = "1970-01-01";
const DATE_FORMATS = ["iso8601", "us", "eu", "long", "short", "unix"] as const;
const TIME_FORMATS = ["12-hour", "24-hour"] as const;
const TIMESTAMP_FORMATS = ["unix", "iso8601"] as const;

export function createDateResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	switch (generator.id) {
		case "date":
			return textResult(generator, request.input, createDates(request));
		case "datetime":
			return fieldsResult(generator, request.input, createDateTimes(request));
		case "time":
			return fieldsResult(generator, request.input, createTimes(request));
		default:
			return undefined;
	}
}

function createDates(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 10, 100);
	const format = parseChoice(request.fields.format, DATE_FORMATS, "iso8601");
	return singleOrList(Array.from({ length: count }, () => formatDate(randomDate(request), format)));
}

function createTimes(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 100);
	return singleOrList(Array.from({ length: count }, () => createTimeRecord(request)));
}

function createDateTimes(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 100);
	return singleOrList(Array.from({ length: count }, () => createTimestampRecord(request)));
}

function createTimeRecord(request: GeneratorRequest) {
	const format = parseChoice(request.fields.format, TIME_FORMATS, "24-hour");
	const startHour = parseInteger(request.fields.startHour ?? request.fields.start_hour ?? "", 0, 0, 23);
	const endHour = parseInteger(request.fields.endHour ?? request.fields.end_hour ?? "", 23, 0, 23);
	const includeSeconds = parseBoolean(request.fields.includeSeconds ?? request.fields.include_seconds, true);
	const hour = randomIntegerBetween(startHour, endHour);
	const minute = randomIntegerInRange(60);
	const second = includeSeconds ? randomIntegerInRange(60) : 0;
	const time24h = `${pad(hour)}:${pad(minute)}${includeSeconds ? `:${pad(second)}` : ""}`;
	const time12h = format12Hour(hour, minute, second, includeSeconds);

	return {
		formatted: format === "12-hour" ? time12h : time24h,
		hour: `${hour}`,
		minute: `${minute}`,
		period: hour >= 12 ? "PM" : "AM",
		second: `${second}`,
		time12h,
		time24h,
		totalSeconds: `${hour * 3600 + minute * 60 + second}`,
	};
}

function createTimestampRecord(request: GeneratorRequest) {
	const date = randomDate(request);
	const format = parseChoice(request.fields.format, TIMESTAMP_FORMATS, "unix");
	const unix = Math.floor(date.getTime() / 1000);
	return {
		formatted: format === "iso8601" ? date.toISOString() : `${unix}`,
		human: date.toUTCString(),
		iso8601: date.toISOString(),
		unix: `${unix}`,
	};
}

function randomDate(request: GeneratorRequest) {
	return randomDateInRange(
		request.fields.startDate ?? request.fields.start_date ?? request.fields.start ?? DEFAULT_START_DATE,
		request.fields.endDate ?? request.fields.end_date ?? request.fields.end ?? todayIsoDate(),
	);
}

function formatDate(date: Date, format: (typeof DATE_FORMATS)[number]) {
	switch (format) {
		case "eu":
			return new Intl.DateTimeFormat("en-GB", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			}).format(date);
		case "long":
			return new Intl.DateTimeFormat("en-US", {
				dateStyle: "full",
				timeZone: "UTC",
			}).format(date);
		case "short":
			return new Intl.DateTimeFormat("en-US", {
				dateStyle: "medium",
				timeZone: "UTC",
			}).format(date);
		case "unix":
			return `${Math.floor(date.getTime() / 1000)}`;
		case "us":
			return new Intl.DateTimeFormat("en-US", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			}).format(date);
		case "iso8601":
			return date.toISOString().slice(0, 10);
	}
}

function format12Hour(hour: number, minute: number, second: number, includeSeconds: boolean) {
	const displayHour = hour % 12 || 12;
	return `${pad(displayHour)}:${pad(minute)}${includeSeconds ? `:${pad(second)}` : ""} ${hour >= 12 ? "PM" : "AM"}`;
}

function pad(value: number) {
	return String(value).padStart(2, "0");
}

function todayIsoDate() {
	return new Date().toISOString().slice(0, 10);
}
