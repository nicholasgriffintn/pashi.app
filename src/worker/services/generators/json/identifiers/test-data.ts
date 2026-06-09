import type { GeneratorRequest } from "../../request";
import {
	parseChoice,
	parseCount,
	parseBoolean,
	parseInteger,
	parseNumber,
	randomCharacters,
	randomChoice,
	randomIntegerInRange,
	randomUnitInterval,
	singleOrList,
} from "../../../../utils/generation";

const DIGITS = "0123456789";
const IBAN_COUNTRIES = ["DE", "FR", "GB", "IT", "ES", "NL"] as const;
const CARD_BRANDS = ["visa", "mastercard", "amex", "discover"] as const;
const CARDHOLDER_FIRST_NAMES = [
	"ALEX",
	"CASEY",
	"JORDAN",
	"MORGAN",
	"RILEY",
	"SAM",
	"TAYLOR",
	"AVERY",
	"JAMIE",
	"QUINN",
] as const;
const CARDHOLDER_LAST_NAMES = [
	"ANDERSON",
	"BROWN",
	"CLARK",
	"DAVIS",
	"EVANS",
	"GARCIA",
	"HARRIS",
	"JOHNSON",
	"MILLER",
	"WILSON",
] as const;
const COORDINATE_FORMATS = ["decimal", "dms", "dm"] as const;
const COORDINATE_REGIONS = [
	"global",
	"north-america",
	"south-america",
	"europe",
	"africa",
	"asia",
	"oceania",
	"usa",
	"canada",
	"uk",
	"australia",
] as const;
const COORDINATE_BOUNDS: Record<(typeof COORDINATE_REGIONS)[number], CoordinateBounds> = {
	africa: { label: "Africa", maxLat: 38, maxLon: 52, minLat: -35, minLon: -18 },
	asia: { label: "Asia", maxLat: 55, maxLon: 180, minLat: -10, minLon: 26 },
	australia: { label: "Australia", maxLat: -10, maxLon: 154, minLat: -44, minLon: 112 },
	canada: { label: "Canada", maxLat: 72, maxLon: -52, minLat: 42, minLon: -141 },
	europe: { label: "Europe", maxLat: 71, maxLon: 40, minLat: 36, minLon: -10 },
	global: { label: "Global", maxLat: 90, maxLon: 180, minLat: -90, minLon: -180 },
	"north-america": { label: "North America", maxLat: 72, maxLon: -52, minLat: 15, minLon: -168 },
	oceania: { label: "Oceania", maxLat: 0, maxLon: 180, minLat: -50, minLon: 110 },
	"south-america": { label: "South America", maxLat: 13, maxLon: -34, minLat: -56, minLon: -82 },
	uk: { label: "United Kingdom", maxLat: 59, maxLon: 2, minLat: 49, minLon: -8 },
	usa: { label: "United States", maxLat: 49, maxLon: -66, minLat: 24, minLon: -125 },
};

interface CoordinateBounds {
	label: string;
	maxLat: number;
	maxLon: number;
	minLat: number;
	minLon: number;
}

export function createCards(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 100);
	return singleOrList(Array.from({ length: count }, () => createCard(request)));
}

export function createCoordinateRecords(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 100);
	return singleOrList(Array.from({ length: count }, () => createCoordinates(request)));
}

export function createIbans(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 10, 25);
	const country = parseIbanCountry(request.fields.country);
	return singleOrList(Array.from({ length: count }, () => createIban(country)));
}

function createCard(request: GeneratorRequest) {
	const brand = parseChoice(request.fields.type ?? request.fields.brand, CARD_BRANDS, "visa");
	const includeDetails = parseBoolean(request.fields.includeDetails ?? request.fields.include_details, true);
	const includeName = parseBoolean(request.fields.includeName ?? request.fields.include_name, true);
	const profile = cardProfile(brand);
	const prefix = randomChoice(profile.prefixes);
	const body = `${prefix}${randomCharacters(DIGITS, profile.length - prefix.length - 1)}`;
	const number = `${body}${luhnCheckDigit(body)}`;
	const card = {
		brand: profile.label,
		luhnValid: "true",
		number,
		type: brand,
		warning: "TESTING ONLY - no real account or funds",
	};

	return {
		...card,
		...(includeName ? { name: createCardholderName() } : {}),
		...(includeDetails ? createCardDetails(profile) : {}),
	};
}

function cardProfile(brand: (typeof CARD_BRANDS)[number]) {
	switch (brand) {
		case "amex":
			return { cvvLength: 4, label: "American Express", length: 15, prefixes: ["34", "37"] };
		case "discover":
			return { cvvLength: 3, label: "Discover", length: 16, prefixes: ["6011", "65"] };
		case "mastercard":
			return {
				cvvLength: 3,
				label: "Mastercard",
				length: 16,
				prefixes: [`${randomIntegerInRange(5) + 51}`, `${randomIntegerInRange(500) + 2221}`],
			};
		case "visa":
			return { cvvLength: 3, label: "Visa", length: 16, prefixes: ["4"] };
	}
}

function createCardDetails(profile: ReturnType<typeof cardProfile>) {
	return {
		cvv: randomCharacters(DIGITS, profile.cvvLength),
		expiration: createCardExpiration(),
	};
}

function createCardExpiration() {
	const month = String(randomIntegerInRange(12) + 1).padStart(2, "0");
	const year = randomIntegerInRange(6) + 27;
	return `${month}/${year}`;
}

function createCardholderName() {
	return `${randomChoice(CARDHOLDER_FIRST_NAMES)} ${randomChoice(CARDHOLDER_LAST_NAMES)}`;
}

function createCoordinates(request: GeneratorRequest) {
	const region = parseChoice(request.fields.region, COORDINATE_REGIONS, "global");
	const format = parseChoice(request.fields.format, COORDINATE_FORMATS, "decimal");
	const precision = parseInteger(request.fields.precision ?? "", 6, 1, 8);
	const bounds = customBounds(request) ?? COORDINATE_BOUNDS[region];
	const latitude = randomCoordinate(bounds.minLat, bounds.maxLat);
	const longitude = randomCoordinate(bounds.minLon, bounds.maxLon);
	const decimal = `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
	return {
		decimal,
		format,
		geoUri: `geo:${latitude.toFixed(precision)},${longitude.toFixed(precision)}`,
		googleMapsUrl: `https://maps.google.com/maps?q=${latitude.toFixed(precision)},${longitude.toFixed(precision)}`,
		latitude: latitude.toFixed(precision),
		longitude: longitude.toFixed(precision),
		pair: formatCoordinatePair(latitude, longitude, format, precision),
		precision: `${precision}`,
		region: bounds.label,
	};
}

function customBounds(request: GeneratorRequest): CoordinateBounds | undefined {
	const minLatInput = request.fields.minLat ?? request.fields.min_lat;
	const maxLatInput = request.fields.maxLat ?? request.fields.max_lat;
	const minLonInput = request.fields.minLon ?? request.fields.min_lon;
	const maxLonInput = request.fields.maxLon ?? request.fields.max_lon;
	if (!minLatInput && !maxLatInput && !minLonInput && !maxLonInput) {
		return undefined;
	}

	const minLat = parseNumber(minLatInput ?? "", -90, -90, 90);
	const maxLat = parseNumber(maxLatInput ?? "", 90, -90, 90);
	const minLon = parseNumber(minLonInput ?? "", -180, -180, 180);
	const maxLon = parseNumber(maxLonInput ?? "", 180, -180, 180);
	return {
		label: "Custom bounds",
		maxLat: Math.max(minLat, maxLat),
		maxLon: Math.max(minLon, maxLon),
		minLat: Math.min(minLat, maxLat),
		minLon: Math.min(minLon, maxLon),
	};
}

function randomCoordinate(min: number, max: number) {
	return min + randomUnitInterval() * (max - min);
}

function formatCoordinatePair(latitude: number, longitude: number, format: (typeof COORDINATE_FORMATS)[number], precision: number) {
	if (format === "dms") {
		return `${formatDms(latitude, "lat")}, ${formatDms(longitude, "lon")}`;
	}
	if (format === "dm") {
		return `${formatDm(latitude, "lat")}, ${formatDm(longitude, "lon")}`;
	}

	return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
}

function formatDms(value: number, axis: "lat" | "lon") {
	const absolute = Math.abs(value);
	const degrees = Math.floor(absolute);
	const minutesFloat = (absolute - degrees) * 60;
	const minutes = Math.floor(minutesFloat);
	const seconds = (minutesFloat - minutes) * 60;
	return `${degrees}°${minutes}'${seconds.toFixed(2)}"${hemisphere(value, axis)}`;
}

function formatDm(value: number, axis: "lat" | "lon") {
	const absolute = Math.abs(value);
	const degrees = Math.floor(absolute);
	const minutes = (absolute - degrees) * 60;
	return `${degrees}°${minutes.toFixed(4)}'${hemisphere(value, axis)}`;
}

function hemisphere(value: number, axis: "lat" | "lon") {
	if (axis === "lat") {
		return value >= 0 ? "N" : "S";
	}

	return value >= 0 ? "E" : "W";
}

function luhnCheckDigit(body: string) {
	const sum = body
		.split("")
		.reverse()
		.reduce((total, character, index) => {
			let digit = Number.parseInt(character, 10);
			if (index % 2 === 0) {
				digit *= 2;
				if (digit > 9) {
					digit -= 9;
				}
			}
			return total + digit;
		}, 0);
	return `${(10 - (sum % 10)) % 10}`;
}

function createIban(country: (typeof IBAN_COUNTRIES)[number]) {
	const bban = createBban(country);
	return `${country}${ibanCheckDigits(country, bban)}${bban}`;
}

function parseIbanCountry(input: string | undefined) {
	const normalised = input?.trim().toUpperCase();
	const country = IBAN_COUNTRIES.find((option) => option === normalised);
	return country ?? "GB";
}

function createBban(country: (typeof IBAN_COUNTRIES)[number]) {
	switch (country) {
		case "DE":
			return randomCharacters(DIGITS, 18);
		case "ES":
			return randomCharacters(DIGITS, 20);
		case "FR":
			return `${randomCharacters(DIGITS, 10)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 11)}${randomCharacters(DIGITS, 2)}`;
		case "GB":
			return `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 4)}${randomCharacters(DIGITS, 14)}`;
		case "IT":
			return `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1)}${randomCharacters(DIGITS, 10)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 12)}`;
		case "NL":
			return `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 4)}${randomCharacters(DIGITS, 10)}`;
	}
}

function ibanCheckDigits(countryCode: string, bban: string) {
	const rearranged = `${bban}${countryCode}00`;
	const numeric = rearranged
		.split("")
		.map((character) => {
			const code = character.charCodeAt(0);
			return code >= 65 && code <= 90 ? `${code - 55}` : character;
		})
		.join("");
	let remainder = 0;
	for (const digit of numeric) {
		remainder = (remainder * 10 + Number.parseInt(digit, 10)) % 97;
	}

	return String(98 - remainder).padStart(2, "0");
}
