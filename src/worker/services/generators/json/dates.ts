import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import { parseCount, parseDate, randomUnitInterval, singleOrList } from "../../../utils/generation";
import { fieldsResult, textResult } from "./result";

const DEFAULT_START = "2000-01-01T00:00:00.000Z";
const DEFAULT_END = "2030-12-31T23:59:59.999Z";

export function createDateResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	switch (generator.id) {
		case "date":
			return textResult(generator, request.input, createDates(request));
		case "time":
			return textResult(generator, request.input, createTimes(request));
		case "datetime":
			return fieldsResult(generator, request.input, createDateTimes(request));
		default:
			return undefined;
	}
}

function createDates(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => formatDate(randomDate(request), request.fields.format)));
}

function createTimes(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => formatTime(randomDate(request), request.fields.format)));
}

function createDateTime(request: GeneratorRequest) {
	const date = randomDate(request);
	return {
		date: formatDate(date, "iso-date"),
		epochMilliseconds: `${date.getTime()}`,
		epochSeconds: `${Math.floor(date.getTime() / 1000)}`,
		iso: date.toISOString(),
		time: formatTime(date, "24h"),
		utc: date.toUTCString(),
	};
}

function createDateTimes(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => createDateTime(request)));
}

function randomDate(request: GeneratorRequest) {
	const start = parseDate(request.fields.start || DEFAULT_START);
	const end = parseDate(request.fields.end || DEFAULT_END);
	const lower = Math.min(start.getTime(), end.getTime());
	const upper = Math.max(start.getTime(), end.getTime());
	return new Date(Math.floor(lower + randomUnitInterval() * (upper - lower + 1)));
}

function formatDate(date: Date, format = "iso-date") {
	if (format === "us") {
		return new Intl.DateTimeFormat("en-US", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		}).format(date);
	}

	if (format === "uk") {
		return new Intl.DateTimeFormat("en-GB", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		}).format(date);
	}

	return date.toISOString().slice(0, 10);
}

function formatTime(date: Date, format = "24h") {
	if (format === "12h") {
		return new Intl.DateTimeFormat("en-US", {
			hour: "numeric",
			hour12: true,
			minute: "2-digit",
			second: "2-digit",
			timeZone: "UTC",
		}).format(date);
	}

	return new Intl.DateTimeFormat("en-GB", {
		hour: "2-digit",
		hour12: false,
		minute: "2-digit",
		second: "2-digit",
		timeZone: "UTC",
	}).format(date);
}
