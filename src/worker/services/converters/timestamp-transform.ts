export type TimestampTransformFormat =
	| "add"
	| "difference"
	| "discord"
	| "iso"
	| "milliseconds"
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
];

export class TimestampTransformError extends Error {}

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

export function isTimestampTransformFormat(value: string): value is TimestampTransformFormat {
	return TIMESTAMP_TRANSFORM_FORMATS.some((format) => format === value);
}

export function transformTimestamp(input: string, format: TimestampTransformFormat, fields: Record<string, string>) {
	const date = parseTimestamp(input);
	switch (format) {
		case "add":
			return addTime(date, fields, 1).toISOString();
		case "difference":
			return timestampDifference(date, parseTimestamp(fields.until ?? fields.end ?? ""));
		case "discord":
			return discordTimestamp(date, fields.style);
		case "iso":
			return date.toISOString();
		case "milliseconds":
			return `${date.getTime()}`;
		case "readable":
			return date.toUTCString();
		case "rfc2822":
			return formatRfc2822(date);
		case "subtract":
			return addTime(date, fields, -1).toISOString();
		case "unix":
			return `${Math.floor(date.getTime() / 1000)}`;
	}
}

function parseTimestamp(input: string) {
	const value = input.trim();
	if (!value) {
		throw new TimestampTransformError("Enter a timestamp or date.");
	}

	if (/^-?\d+$/.test(value)) {
		const numeric = Number(value);
		const milliseconds = Math.abs(numeric) < 10_000_000_000 ? numeric * 1000 : numeric;
		return validDate(new Date(milliseconds));
	}

	return validDate(new Date(value));
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
	return JSON.stringify({
		days: Math.floor(seconds / 86_400),
		hours: Math.floor(seconds / 3600),
		milliseconds,
		minutes: Math.floor(seconds / 60),
		seconds,
	}, null, 2);
}

function discordTimestamp(date: Date, styleInput: string | undefined) {
	const style = DISCORD_STYLES[(styleInput ?? "full").trim().toLowerCase()] ?? "F";
	return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

function formatRfc2822(date: Date) {
	return date.toUTCString().replace("GMT", "+0000");
}
