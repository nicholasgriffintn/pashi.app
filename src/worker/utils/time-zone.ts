import { isValidCalendarDate } from "./calendar-date.ts";

export class TimeZoneError extends Error {}

export interface WallTime {
	day: number;
	hour: number;
	millisecond: number;
	minute: number;
	month: number;
	second: number;
	year: number;
}

export type WallTimeResolution = "ambiguous" | "exact" | "non-existent";

export interface ResolvedWallTime {
	alternativeEpochMs?: number;
	epochMs: number;
	resolution: WallTimeResolution;
}

export interface ParsedDateTime {
	offset?: { milliseconds: number; text: string };
	wall: WallTime;
}

export interface ZonedView {
	abbreviation: string | null;
	dst: boolean;
	localTime: string;
	name: string | null;
	offset: string;
	zone: string;
}

const MILLISECONDS_PER_DAY = 86_400_000;
const ABBREVIATION_LOCALES = ["en-US", "en-GB"] as const;
const OFFSET_STYLE_NAME = /^(GMT|UTC)[+\-−]/;
const ISO_DATE_TIME =
	/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;
const ZONE_EXAMPLES = "Europe/London or America/New_York";
const partsFormatters = new Map<string, Intl.DateTimeFormat>();
let zoneLookup: Map<string, string> | undefined;

function knownZones() {
	if (!zoneLookup) {
		zoneLookup = new Map(
			["UTC", ...Intl.supportedValuesOf("timeZone")].map((zone) => [zone.toLowerCase(), zone]),
		);
	}

	return zoneLookup;
}

export function resolveTimeZone(input: string | undefined, label: string) {
	const value = input?.trim() ?? "";

	if (!value) {
		throw new TimeZoneError(`Enter ${label} as an IANA time zone, such as ${ZONE_EXAMPLES}.`);
	}

	const zones = knownZones();
	const direct = zones.get(value.toLowerCase());

	if (direct) {
		return direct;
	}

	const canonical = canonicalZone(value);

	if (canonical && zones.has(canonical.toLowerCase())) {
		return value;
	}

	throw new TimeZoneError(
		`Unknown time zone "${value}" for ${label}. Use an IANA name such as ${ZONE_EXAMPLES}.`,
	);
}

function canonicalZone(zone: string) {
	try {
		return new Intl.DateTimeFormat("en-GB", { timeZone: zone }).resolvedOptions().timeZone;
	} catch {
		return undefined;
	}
}

function partsFormatter(zone: string) {
	let formatter = partsFormatters.get(zone);

	if (!formatter) {
		formatter = new Intl.DateTimeFormat("en-GB", {
			day: "numeric",
			era: "short",
			hour: "numeric",
			hourCycle: "h23",
			minute: "numeric",
			month: "numeric",
			second: "numeric",
			timeZone: zone,
			year: "numeric",
		});
		partsFormatters.set(zone, formatter);
	}

	return formatter;
}

export function wallTimeAt(epochMs: number, zone: string): WallTime {
	const values: Record<string, string> = {};

	for (const part of partsFormatter(zone).formatToParts(epochMs)) {
		values[part.type] = part.value;
	}

	const year = Number(values.year);

	return {
		day: Number(values.day),
		hour: Number(values.hour),
		millisecond: ((epochMs % 1000) + 1000) % 1000,
		minute: Number(values.minute),
		month: Number(values.month),
		second: Number(values.second),
		year: values.era?.startsWith("B") ? 1 - year : year,
	};
}

export function wallTimeAsUtc(wall: WallTime) {
	const date = new Date(0);

	date.setUTCFullYear(wall.year, wall.month - 1, wall.day);
	date.setUTCHours(wall.hour, wall.minute, wall.second, wall.millisecond);

	return date.getTime();
}

export function offsetMillisecondsAt(epochMs: number, zone: string) {
	return wallTimeAsUtc(wallTimeAt(epochMs, zone)) - epochMs;
}

export function isValidWallTime(wall: WallTime) {
	return (
		isValidCalendarDate(wall) &&
		[wall.hour, wall.minute, wall.second, wall.millisecond].every(Number.isInteger) &&
		wall.hour >= 0 &&
		wall.hour <= 23 &&
		wall.minute >= 0 &&
		wall.minute <= 59 &&
		wall.second >= 0 &&
		wall.second <= 59 &&
		wall.millisecond >= 0 &&
		wall.millisecond <= 999
	);
}

export function parseUtcOffset(value: string) {
	if (value.toUpperCase() === "Z") {
		return 0;
	}

	const match = /^([+-])(\d{2}):?(\d{2})?$/.exec(value);
	const hours = Number(match?.[2]);
	const minutes = Number(match?.[3] ?? 0);

	if (!match || hours > 23 || minutes > 59) {
		throw new TimeZoneError("Enter a UTC offset between -23:59 and +23:59, or Z.");
	}

	return (match[1] === "-" ? -1 : 1) * (hours * 60 + minutes) * 60_000;
}

export function parseIsoDateTime(value: string): ParsedDateTime | undefined {
	const match = ISO_DATE_TIME.exec(value.trim());

	if (!match) {
		return undefined;
	}

	const wall: WallTime = {
		day: Number(match[3]),
		hour: Number(match[4] ?? 0),
		millisecond: Number((match[7] ?? "").padEnd(3, "0").slice(0, 3)),
		minute: Number(match[5] ?? 0),
		month: Number(match[2]),
		second: Number(match[6] ?? 0),
		year: Number(match[1]),
	};

	if (!isValidWallTime(wall)) {
		throw new TimeZoneError("Enter a real date and time, such as 2027-03-03T10:30.");
	}

	const offset = match[8]?.toUpperCase();

	return offset
		? { offset: { milliseconds: parseUtcOffset(offset), text: offset }, wall }
		: { wall };
}

export function resolveWallTime(wall: WallTime, zone: string): ResolvedWallTime {
	const local = wallTimeAsUtc(wall);
	const offsetBefore = offsetMillisecondsAt(local - MILLISECONDS_PER_DAY, zone);
	const offsetAfter = offsetMillisecondsAt(local + MILLISECONDS_PER_DAY, zone);
	const candidates = [...new Set([offsetBefore, offsetAfter])]
		.map((offset) => local - offset)
		.filter((epochMs) => wallTimeAsUtc(wallTimeAt(epochMs, zone)) === local)
		.toSorted((left, right) => left - right);

	if (candidates.length === 0) {
		return { epochMs: local - offsetBefore, resolution: "non-existent" };
	}

	if (candidates.length > 1) {
		return {
			alternativeEpochMs: candidates[candidates.length - 1],
			epochMs: candidates[0],
			resolution: "ambiguous",
		};
	}

	return { epochMs: candidates[0], resolution: "exact" };
}

export function formatOffset(offsetMs: number) {
	const sign = offsetMs < 0 ? "-" : "+";
	const totalSeconds = Math.round(Math.abs(offsetMs) / 1000);
	const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
	const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
	const seconds = totalSeconds % 60;

	return `${sign}${hours}:${minutes}${seconds ? `:${String(seconds).padStart(2, "0")}` : ""}`;
}

function pad(value: number, length = 2) {
	return String(value).padStart(length, "0");
}

export function formatWallTime(wall: WallTime) {
	const fraction = wall.millisecond ? `.${pad(wall.millisecond, 3)}` : "";

	return `${pad(wall.year, 4)}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)}${fraction}`;
}

function zoneName(epochMs: number, zone: string, style: "long" | "short", locale: string) {
	return (
		new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: style })
			.formatToParts(epochMs)
			.find((part) => part.type === "timeZoneName")?.value ?? null
	);
}

function zoneAbbreviation(epochMs: number, zone: string) {
	for (const locale of ABBREVIATION_LOCALES) {
		const name = zoneName(epochMs, zone, "short", locale);

		if (name && !OFFSET_STYLE_NAME.test(name)) {
			return name;
		}
	}

	return null;
}

function isDaylightSaving(epochMs: number, zone: string) {
	const { year } = wallTimeAt(epochMs, zone);
	const firstOfMonth = { day: 1, hour: 0, millisecond: 0, minute: 0, second: 0, year };
	const january = offsetMillisecondsAt(wallTimeAsUtc({ ...firstOfMonth, month: 1 }), zone);
	const july = offsetMillisecondsAt(wallTimeAsUtc({ ...firstOfMonth, month: 7 }), zone);

	return january !== july && offsetMillisecondsAt(epochMs, zone) > Math.min(january, july);
}

export function zonedView(epochMs: number, zone: string): ZonedView {
	const longName = zoneName(epochMs, zone, "long", "en-GB");

	return {
		abbreviation: zoneAbbreviation(epochMs, zone),
		dst: isDaylightSaving(epochMs, zone),
		localTime: formatWallTime(wallTimeAt(epochMs, zone)),
		name: longName && !OFFSET_STYLE_NAME.test(longName) ? longName : null,
		offset: formatOffset(offsetMillisecondsAt(epochMs, zone)),
		zone,
	};
}
