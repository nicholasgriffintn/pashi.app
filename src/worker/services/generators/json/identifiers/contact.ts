import type { GeneratorRequest } from "../../request";
import {
	parseBoolean,
	parseChoice,
	parseCount,
	randomCharacters,
	randomChoice,
	randomIntegerInRange,
	singleOrList,
} from "../../../../utils/generation";

const DIGITS = "0123456789";
const PHONE_COUNTRIES = ["US", "CA", "GB", "DE", "FR", "ES", "IT", "NL", "AU", "JP", "CN", "IN", "BR", "MX"] as const;
const PHONE_FORMATS = ["national", "international", "e164"] as const;
const POSTAL_LOCALES = ["en_US", "en_GB", "en_CA", "fr_FR", "es_ES", "it_IT", "de_DE", "pt_PT", "nl_NL", "pl_PL"] as const;
const POSTAL_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function createPhoneNumbers(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 10, 100);
	const country = parseUpperChoice(request.fields.country, PHONE_COUNTRIES, "US");
	const format = parseChoice(request.fields.format, PHONE_FORMATS, "national");
	const unique = parseBoolean(request.fields.unique, false);
	return createUniqueOrRepeated(count, unique, () => formatPhoneNumber(country, format));
}

export function createZipCodes(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 10, 100);
	const locale = parseLocale(request.fields.locale);
	return singleOrList(Array.from({ length: count }, () => createPostalCode(locale)));
}

function createUniqueOrRepeated(count: number, unique: boolean, createValue: () => string) {
	if (!unique) {
		return singleOrList(Array.from({ length: count }, createValue));
	}

	const values = new Set<string>();
	let attempts = 0;

	while (values.size < count && attempts < count * 20) {
		values.add(createValue());
		attempts += 1;
	}

	return singleOrList([...values]);
}

function formatPhoneNumber(country: (typeof PHONE_COUNTRIES)[number], format: (typeof PHONE_FORMATS)[number]) {
	const profile = phoneProfile(country);
	const nationalDigits = profile.createNationalDigits();

	if (format === "e164") {
		return `+${profile.countryCode}${nationalDigits}`;
	}

	if (format === "international") {
		return `+${profile.countryCode} ${profile.formatInternational(nationalDigits)}`;
	}

	return profile.formatNational(nationalDigits);
}

function phoneProfile(country: (typeof PHONE_COUNTRIES)[number]) {
	switch (country) {
		case "AU":
			return fixedPrefixPhone("61", () => `4${randomCharacters(DIGITS, 8)}`, (value) => `0${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`);
		case "BR":
			return fixedPrefixPhone("55", () => `${randomChoice(["11", "21", "31", "41", "51"])}9${randomCharacters(DIGITS, 8)}`, (value) => `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`);
		case "CA":
			return nanpPhone("1", ["204", "236", "249", "343", "416", "438", "514", "604", "647", "778"]);
		case "CN":
			return fixedPrefixPhone("86", () => `1${randomChoice(["3", "5", "7", "8"])}${randomCharacters(DIGITS, 9)}`, (value) => `${value.slice(0, 3)} ${value.slice(3, 7)} ${value.slice(7)}`);
		case "DE":
			return fixedPrefixPhone("49", () => `15${randomCharacters(DIGITS, 9)}`, (value) => `0${value.slice(0, 3)} ${value.slice(3)}`);
		case "ES":
			return fixedPrefixPhone("34", () => `${randomChoice(["6", "7", "9"])}${randomCharacters(DIGITS, 8)}`, (value) => `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`);
		case "FR":
			return fixedPrefixPhone("33", () => `${randomChoice(["6", "7"])}${randomCharacters(DIGITS, 8)}`, (value) => `0${value.slice(0, 1)} ${value.slice(1, 3)} ${value.slice(3, 5)} ${value.slice(5, 7)} ${value.slice(7)}`);
		case "GB":
			return fixedPrefixPhone("44", () => `7${randomCharacters(DIGITS, 9)}`, (value) => `0${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7)}`);
		case "IN":
			return fixedPrefixPhone("91", () => `${randomChoice(["6", "7", "8", "9"])}${randomCharacters(DIGITS, 9)}`, (value) => `${value.slice(0, 5)} ${value.slice(5)}`);
		case "IT":
			return fixedPrefixPhone("39", () => `3${randomCharacters(DIGITS, 9)}`, (value) => `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`);
		case "JP":
			return fixedPrefixPhone("81", () => `90${randomCharacters(DIGITS, 8)}`, (value) => `0${value.slice(0, 2)}-${value.slice(2, 6)}-${value.slice(6)}`);
		case "MX":
			return fixedPrefixPhone("52", () => `${randomChoice(["55", "33", "81"])}${randomCharacters(DIGITS, 8)}`, (value) => `${value.slice(0, 2)} ${value.slice(2, 6)} ${value.slice(6)}`);
		case "NL":
			return fixedPrefixPhone("31", () => `6${randomCharacters(DIGITS, 8)}`, (value) => `0${value.slice(0, 1)} ${value.slice(1, 5)} ${value.slice(5)}`);
		case "US":
			return nanpPhone("1", ["202", "212", "303", "312", "415", "617", "702", "718", "805", "917"]);
	}
}

function fixedPrefixPhone(
	countryCode: string,
	createNationalDigits: () => string,
	formatNational: (nationalDigits: string) => string,
) {
	return {
		countryCode,
		createNationalDigits,
		formatInternational: (nationalDigits: string) => formatNational(nationalDigits).replace(/^0/, ""),
		formatNational,
	};
}

function nanpPhone(countryCode: string, areaCodes: readonly string[]) {
	return {
		countryCode,
		createNationalDigits: () => `${randomChoice(areaCodes)}${randomIntegerInRange(8) + 2}${randomCharacters(DIGITS, 2)}${randomCharacters(DIGITS, 4)}`,
		formatInternational: (value: string) => `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`,
		formatNational: (value: string) => `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`,
	};
}

function createPostalCode(locale: (typeof POSTAL_LOCALES)[number]) {
	switch (locale) {
		case "de_DE":
		case "es_ES":
		case "fr_FR":
		case "it_IT":
			return randomCharacters(DIGITS, 5);
		case "en_CA":
			return `${randomCharacters(POSTAL_LETTERS, 1)}${randomCharacters(DIGITS, 1)}${randomCharacters(POSTAL_LETTERS, 1)} ${randomCharacters(DIGITS, 1)}${randomCharacters(POSTAL_LETTERS, 1)}${randomCharacters(DIGITS, 1)}`;
		case "en_GB":
			return `${randomCharacters(POSTAL_LETTERS, 2)}${randomIntegerInRange(90) + 10} ${randomCharacters(DIGITS, 1)}${randomCharacters(POSTAL_LETTERS, 2)}`;
		case "en_US":
			return `${randomIntegerInRange(90_000) + 10_000}`;
		case "nl_NL":
			return `${randomIntegerInRange(9000) + 1000} ${randomCharacters(POSTAL_LETTERS, 2)}`;
		case "pl_PL":
			return `${randomIntegerInRange(90) + 10}-${String(randomIntegerInRange(1000)).padStart(3, "0")}`;
		case "pt_PT":
			return `${randomIntegerInRange(9000) + 1000}-${String(randomIntegerInRange(1000)).padStart(3, "0")}`;
	}
}

function parseUpperChoice<T extends string>(input: string | undefined, options: readonly T[], fallback: T) {
	const normalised = input?.trim().toUpperCase();
	return options.find((option) => option === normalised) ?? fallback;
}

function parseLocale(input: string | undefined) {
	const normalised = input?.trim();
	return POSTAL_LOCALES.find((option) => option === normalised) ?? "en_US";
}
