import { fetchCachedJson } from "../../utils/cached-fetch.ts";
import { asArray, asNumber, asRecord, asString, asStringArray } from "../../utils/json-guards.ts";

export const UK_LOOKUP_FORMATS = ["postcode", "carbon", "floods"] as const;

export type UkLookupFormat = (typeof UK_LOOKUP_FORMATS)[number];

export class UkLookupError extends Error {
	readonly status: number;

	constructor(message: string, status = 422) {
		super(message);
		this.status = status;
	}
}

const POSTCODES_URL = "https://api.postcodes.io";
const CARBON_URL = "https://api.carbonintensity.org.uk";
const FLOODS_URL = "https://environment.data.gov.uk/flood-monitoring/id/floods";

const POSTCODE_TTL_SECONDS = 24 * 60 * 60;
const CARBON_TTL_SECONDS = 15 * 60;
const FLOODS_TTL_SECONDS = 5 * 60;
const FLOODS_TIMEOUT_MS = 20_000;

const POSTCODE_MAX_BYTES = 16 * 1024;
const CARBON_MAX_BYTES = 32 * 1024;
const FLOODS_MAX_BYTES = 2 * 1024 * 1024;

const MAX_FLOODS_RETURNED = 20;
const MAX_FLOODS_FETCHED = 500;
const MAX_FLOOD_DISTANCE_KM = 100;
const DEFAULT_FLOOD_DISTANCE_KM = 10;
const MAX_COUNTY_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 500;

const FULL_POSTCODE = /^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/;
const OUTWARD_CODE = /^[A-Z]{1,2}\d[A-Z\d]?$/;
const COORDINATES =
	/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)(?:\s*,\s*(\d{1,3}(?:\.\d+)?))?$/;
const COUNTY_LIST = /^[A-Za-z][A-Za-z\s,'&.-]*$/;
const NATIONAL_KEYWORDS = new Set(["", "all", "gb", "national", "uk"]);

const POSTCODES_ATTRIBUTION =
	"Contains OS data © Crown copyright and database right. Contains Royal Mail data © Royal Mail copyright and database right. Source: Office for National Statistics licensed under the Open Government Licence v3.0.";
const CARBON_ATTRIBUTION =
	"Carbon Intensity API, National Energy System Operator (NESO) and partners, licensed under CC BY 4.0.";
const FLOODS_ATTRIBUTION =
	"This uses Environment Agency flood and river level data from the real-time data API (Beta). Licensed under the Open Government Licence v3.0.";

export function isUkLookupFormat(value: string | undefined): value is UkLookupFormat {
	return UK_LOOKUP_FORMATS.some((format) => format === value);
}

function compactPostcode(input: string) {
	return input.replace(/\s+/g, "").toUpperCase();
}

function outwardCodeOf(input: string) {
	const compact = compactPostcode(input);
	const full = FULL_POSTCODE.exec(compact);

	if (full) {
		return full[1];
	}

	return OUTWARD_CODE.test(compact) ? compact : undefined;
}

function clip(value: string | undefined) {
	return value && value.length > MAX_MESSAGE_LENGTH
		? `${value.slice(0, MAX_MESSAGE_LENGTH)}…`
		: value;
}

function nullable<T>(value: T | undefined) {
	return value ?? null;
}

async function lookupPostcode(input: string) {
	const compact = compactPostcode(input);
	const isFull = FULL_POSTCODE.test(compact);

	if (!isFull && !OUTWARD_CODE.test(compact)) {
		throw new UkLookupError(
			"Enter a UK postcode such as SW1A 1AA, or an outward code such as SW1A.",
		);
	}

	const endpoint = isFull ? "postcodes" : "outcodes";
	const { body, status } = await fetchCachedJson(
		`${POSTCODES_URL}/${endpoint}/${encodeURIComponent(compact)}`,
		{
			maxBytes: POSTCODE_MAX_BYTES,
			source: "postcodes.io",
			ttlSeconds: POSTCODE_TTL_SECONDS,
		},
	);
	const result = asRecord(asRecord(body)?.result);

	if (status !== 200 || !result) {
		throw new UkLookupError(`No UK postcode found for ${input.trim()}.`, 404);
	}

	const common = {
		attribution: POSTCODES_ATTRIBUTION,
		latitude: nullable(asNumber(result.latitude)),
		longitude: nullable(asNumber(result.longitude)),
		source: "postcodes.io",
	};

	if (!isFull) {
		return {
			...common,
			constituencies: asStringArray(result.parliamentary_constituency),
			countries: asStringArray(result.country),
			localAuthorities: asStringArray(result.admin_district),
			outcode: asString(result.outcode) ?? compact,
			type: "outward-code",
			wards: asStringArray(result.admin_ward),
		};
	}

	return {
		...common,
		constituency: nullable(
			asString(result.parliamentary_constituency_2024) ??
				asString(result.parliamentary_constituency),
		),
		country: nullable(asString(result.country)),
		county: nullable(asString(result.admin_county)),
		localAuthority: nullable(asString(result.admin_district)),
		postcode: asString(result.postcode) ?? compact,
		region: nullable(asString(result.region)),
		type: "postcode",
		ward: nullable(asString(result.admin_ward)),
	};
}

function readGenerationMix(value: unknown) {
	return asArray(value).flatMap((entry) => {
		const record = asRecord(entry);
		const fuel = asString(record?.fuel);
		const percentage = asNumber(record?.perc);

		return fuel && percentage !== undefined ? [{ fuel, percentage }] : [];
	});
}

function readIntensity(value: unknown) {
	const record = asRecord(value);

	return {
		actual: nullable(asNumber(record?.actual)),
		forecast: nullable(asNumber(record?.forecast)),
		index: nullable(asString(record?.index)),
		unit: "gCO2/kWh",
	};
}

async function fetchCarbon(path: string) {
	const { body, status } = await fetchCachedJson(`${CARBON_URL}${path}`, {
		maxBytes: CARBON_MAX_BYTES,
		source: "Carbon Intensity API",
		ttlSeconds: CARBON_TTL_SECONDS,
	});

	return { data: asRecord(body)?.data, status };
}

async function lookupCarbon(input: string) {
	const common = { attribution: CARBON_ATTRIBUTION, source: "Carbon Intensity API (NESO)" };
	const keyword = input.trim().toLowerCase();

	if (NATIONAL_KEYWORDS.has(keyword)) {
		const [intensity, generation] = await Promise.all([
			fetchCarbon("/intensity"),
			fetchCarbon("/generation"),
		]);
		const period = asRecord(asArray(intensity.data)[0]);
		const mix = asRecord(generation.data);

		if (!period) {
			throw new UkLookupError("The Carbon Intensity API returned no current reading.", 502);
		}

		return {
			...common,
			from: nullable(asString(period.from)),
			generationMix: readGenerationMix(mix?.generationmix),
			intensity: readIntensity(period.intensity),
			scope: "Great Britain",
			to: nullable(asString(period.to)),
		};
	}

	const outcode = outwardCodeOf(input);

	if (!outcode) {
		throw new UkLookupError("Enter national, or a postcode outward code such as RG10.");
	}

	const regional = await fetchCarbon(`/regional/postcode/${encodeURIComponent(outcode)}`);
	const region = asRecord(asArray(regional.data)[0]);
	const period = asRecord(asArray(region?.data)[0]);

	if (regional.status !== 200 || !region || !period) {
		throw new UkLookupError(`No regional carbon intensity found for ${outcode}.`, 404);
	}

	return {
		...common,
		from: nullable(asString(period.from)),
		generationMix: readGenerationMix(period.generationmix),
		intensity: readIntensity(period.intensity),
		outcode,
		region: nullable(asString(region.dnoregion)),
		regionShortName: nullable(asString(region.shortname)),
		scope: "Distribution network region",
		to: nullable(asString(period.to)),
	};
}

function floodFilter(input: string): {
	filter: Record<string, number | string> | null;
	params: Record<string, string>;
} {
	const text = input.trim();
	const coordinates = COORDINATES.exec(text);

	if (coordinates) {
		const latitude = Number(coordinates[1]);
		const longitude = Number(coordinates[2]);
		const distance = coordinates[3] ? Number(coordinates[3]) : DEFAULT_FLOOD_DISTANCE_KM;

		if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
			throw new UkLookupError("Latitude must be within 90 and longitude within 180.");
		}

		if (distance <= 0 || distance > MAX_FLOOD_DISTANCE_KM) {
			throw new UkLookupError(`Distance must be between 0 and ${MAX_FLOOD_DISTANCE_KM} km.`);
		}

		return {
			filter: { distanceKm: distance, latitude, longitude },
			params: { dist: String(distance), lat: String(latitude), long: String(longitude) },
		};
	}

	if (NATIONAL_KEYWORDS.has(text.toLowerCase())) {
		return { filter: null, params: {} };
	}

	if (text.length > MAX_COUNTY_LENGTH || !COUNTY_LIST.test(text)) {
		throw new UkLookupError(
			"Enter a county name, a list of counties separated by commas, or latitude,longitude with an optional distance in km.",
		);
	}

	return { filter: { county: text }, params: { county: text } };
}

function readFlood(value: unknown) {
	const record = asRecord(value);
	const area = asRecord(record?.floodArea);
	const severityLevel = asNumber(record?.severityLevel);

	if (!record || severityLevel === undefined) {
		return [];
	}

	return [
		{
			area: nullable(asString(record.description)),
			areaId: nullable(asString(record.floodAreaID)),
			county: nullable(asString(area?.county)),
			eaArea: nullable(asString(record.eaAreaName)),
			isTidal: record.isTidal === true,
			message: nullable(clip(asString(record.message))),
			raisedAt: nullable(asString(record.timeRaised)),
			riverOrSea: nullable(asString(area?.riverOrSea)),
			severity: nullable(asString(record.severity)),
			severityLevel,
			updatedAt: nullable(asString(record.timeMessageChanged)),
		},
	];
}

async function lookupFloods(input: string) {
	const { filter, params } = floodFilter(input);
	const query = new URLSearchParams({
		...params,
		_limit: String(MAX_FLOODS_FETCHED),
		"min-severity": "3",
	});
	const { body } = await fetchCachedJson(`${FLOODS_URL}?${query.toString()}`, {
		maxBytes: FLOODS_MAX_BYTES,
		source: "Environment Agency flood monitoring API",
		timeoutMs: FLOODS_TIMEOUT_MS,
		ttlSeconds: FLOODS_TTL_SECONDS,
	});
	const warnings = asArray(asRecord(body)?.items)
		.flatMap(readFlood)
		.toSorted(
			(a, b) =>
				a.severityLevel - b.severityLevel || (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
		);
	const severe = warnings.filter((warning) => warning.severityLevel === 1).length;
	const floodWarnings = warnings.filter((warning) => warning.severityLevel === 2).length;
	const alerts = warnings.filter((warning) => warning.severityLevel === 3).length;

	return {
		attribution: FLOODS_ATTRIBUTION,
		counts: { alerts, floodWarnings, severeFloodWarnings: severe },
		filter,
		returned: Math.min(warnings.length, MAX_FLOODS_RETURNED),
		source: "Environment Agency flood monitoring API",
		total: warnings.length,
		truncated: warnings.length > MAX_FLOODS_RETURNED,
		warnings: warnings.slice(0, MAX_FLOODS_RETURNED),
	};
}

const LOOKUPS: Record<UkLookupFormat, (input: string) => Promise<object>> = {
	carbon: lookupCarbon,
	floods: lookupFloods,
	postcode: lookupPostcode,
};

export function lookupUk(input: string, format: UkLookupFormat) {
	return LOOKUPS[format](input);
}
