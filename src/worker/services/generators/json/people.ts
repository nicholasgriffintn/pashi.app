import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import {
	parseBoolean,
	parseCount,
	parseInteger,
	randomCharacters,
	randomChoice,
	randomIntegerInRange,
	singleOrList,
	slugify,
} from "../../../utils/generation";
import { fieldsResult } from "./result";

const PERSON_LOCALES = ["en_US", "fr_FR", "es_ES", "it_IT", "de_DE", "pt_PT", "nl_NL", "pl_PL"] as const;
const GENDERS = ["male", "female"] as const;
const DIGITS = "0123456789";
const FIRST_NAMES = {
	female: ["Ada", "Amara", "Bea", "Dina", "Grace", "Iris", "Lena", "Nia", "Rae", "Sofia"],
	male: ["Caleb", "Eli", "Jules", "Kai", "Milo", "Owen", "Sam", "Theo", "Luca", "Noah"],
} as const;
const LAST_NAMES = ["Archer", "Blake", "Chen", "Diaz", "Ellis", "Foster", "Grant", "Hale", "Ito", "Jones", "Khan", "Lee", "Moore", "Nguyen", "Patel", "Stone"] as const;
const STREETS = ["Arcade Road", "Beacon Street", "Circuit Lane", "Foundry Avenue", "Harbour Way", "Signal Street", "Vector Close", "Wave Terrace"] as const;
const JOB_TITLES = ["Software Engineer", "Product Manager", "Design Lead", "QA Analyst", "Data Engineer", "Operations Manager", "Support Specialist", "Marketing Manager"] as const;
const COMPANIES = ["Arc Labs", "Beacon Works", "Circuit Studio", "Foundry Systems", "Signal Dynamics", "Vector Analytics"] as const;
const LOCALE_DATA: Record<(typeof PERSON_LOCALES)[number], LocaleData> = {
	de_DE: { country: "Germany", countryCode: "DE", phoneCode: "49", postCode: () => randomCharacters(DIGITS, 5), state: () => randomChoice(["BE", "BY", "HH", "HE", "NW"]), taxId: () => `${randomCharacters(DIGITS, 11)}` },
	en_US: { country: "United States", countryCode: "US", phoneCode: "1", postCode: () => `${randomIntegerInRange(90_000) + 10_000}`, state: () => randomChoice(["CA", "IL", "NY", "OR", "TX", "WA"]), taxId: () => `${randomCharacters(DIGITS, 3)}-${randomCharacters(DIGITS, 2)}-${randomCharacters(DIGITS, 4)}` },
	es_ES: { country: "Spain", countryCode: "ES", phoneCode: "34", postCode: () => randomCharacters(DIGITS, 5), state: () => randomChoice(["AN", "CT", "MD", "VC", "PV"]), taxId: () => `${randomCharacters(DIGITS, 8)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1)}` },
	fr_FR: { country: "France", countryCode: "FR", phoneCode: "33", postCode: () => randomCharacters(DIGITS, 5), state: () => randomChoice(["IDF", "NAQ", "ARA", "OCC", "PAC"]), taxId: () => `${randomCharacters(DIGITS, 13)}` },
	it_IT: { country: "Italy", countryCode: "IT", phoneCode: "39", postCode: () => randomCharacters(DIGITS, 5), state: () => randomChoice(["LAZ", "LOM", "PIE", "TOS", "VEN"]), taxId: () => `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6)}${randomCharacters(DIGITS, 2)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1)}${randomCharacters(DIGITS, 2)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1)}${randomCharacters(DIGITS, 3)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1)}` },
	nl_NL: { country: "Netherlands", countryCode: "NL", phoneCode: "31", postCode: () => `${randomIntegerInRange(9000) + 1000} ${randomCharacters("ABCDEFGHJKLMNPQRSTUVWXYZ", 2)}`, state: () => randomChoice(["NH", "ZH", "UT", "GE", "NB"]), taxId: () => `${randomCharacters(DIGITS, 9)}` },
	pl_PL: { country: "Poland", countryCode: "PL", phoneCode: "48", postCode: () => `${randomIntegerInRange(90) + 10}-${String(randomIntegerInRange(1000)).padStart(3, "0")}`, state: () => randomChoice(["DS", "MA", "MZ", "PM", "WP"]), taxId: () => `${randomCharacters(DIGITS, 10)}` },
	pt_PT: { country: "Portugal", countryCode: "PT", phoneCode: "351", postCode: () => `${randomIntegerInRange(9000) + 1000}-${String(randomIntegerInRange(1000)).padStart(3, "0")}`, state: () => randomChoice(["LX", "PT", "BR", "AV", "FA"]), taxId: () => `${randomCharacters(DIGITS, 9)}` },
};

interface LocaleData {
	country: string;
	countryCode: string;
	phoneCode: string;
	postCode: () => string;
	state: () => string;
	taxId: () => string;
}

export function createPeopleResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	switch (generator.id) {
		case "person":
			return fieldsResult(generator, request.input, createPeople(request));
		default:
			return undefined;
	}
}

function createPeople(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 100);
	return singleOrList(Array.from({ length: count }, () => createPerson(request)));
}

function createPerson(request: GeneratorRequest) {
	const locale = parseLocale(request.fields.locale);
	const localeData = LOCALE_DATA[locale];
	const gender = parseGender(request.fields.gender);
	const firstName = randomChoice(FIRST_NAMES[gender]);
	const lastName = randomChoice(LAST_NAMES);
	const fullName = `${firstName} ${lastName}`;
	const age = createAge(request);
	const birthDate = createBirthDate(age);
	const username = `${slugify(fullName)}${randomCharacters(DIGITS, 3)}`;
	const person = {
		address: `${randomIntegerInRange(190) + 10} ${randomChoice(STREETS)}`,
		age: `${age}`,
		birthDate,
		city: randomChoice(citiesFor(locale)),
		country: localeData.country,
		email: `${username}@example.com`,
		firstName,
		gender,
		lastName,
		latitude: randomCoordinate(-90, 90),
		longitude: randomCoordinate(-180, 180),
		name: fullName,
		phone: createPhone(localeData),
		postCode: localeData.postCode(),
		secondaryAddress: randomChoice(["Apt 4B", "Suite 12", "Unit 8", ""]),
		ssn: localeData.taxId(),
		state: localeData.state(),
		title: titleFor(gender),
		username,
	};

	return {
		...person,
		...(parseBoolean(request.fields.includeFinancial ?? request.fields.include_financial, true) ? createFinancialData(localeData.countryCode) : {}),
		...(parseBoolean(request.fields.includeProfessional ?? request.fields.include_professional, true) ? createProfessionalData() : {}),
	};
}

function createAge(request: GeneratorRequest) {
	const minAge = parseInteger(request.fields.ageMin ?? request.fields.age_min ?? request.fields.minAge ?? "", 18, 1, 120);
	const maxAge = parseInteger(request.fields.ageMax ?? request.fields.age_max ?? request.fields.maxAge ?? "", 80, 1, 120);
	const lower = Math.min(minAge, maxAge);
	const upper = Math.max(minAge, maxAge);
	return lower + randomIntegerInRange(upper - lower + 1);
}

function createBirthDate(age: number) {
	const date = new Date();
	date.setUTCFullYear(date.getUTCFullYear() - age);
	date.setUTCMonth(randomIntegerInRange(12));
	date.setUTCDate(randomIntegerInRange(28) + 1);
	return date.toISOString().slice(0, 10);
}

function createFinancialData(countryCode: string) {
	const card = createCreditCard();
	return {
		bankAccount: randomCharacters(DIGITS, 8),
		creditCardExpiration: `${String(randomIntegerInRange(12) + 1).padStart(2, "0")}/${randomIntegerInRange(6) + 27}`,
		creditCardNumber: card.number,
		creditCardType: card.type,
		iban: createIban(countryCode),
		swiftBic: `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 4)}${countryCode}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 2)}XXX`,
	};
}

function createProfessionalData() {
	return {
		company: randomChoice(COMPANIES),
		jobTitle: randomChoice(JOB_TITLES),
	};
}

function createCreditCard() {
	const type = randomChoice(["Visa", "Mastercard", "American Express"] as const);
	const prefix = type === "American Express" ? randomChoice(["34", "37"]) : type === "Mastercard" ? `${randomIntegerInRange(5) + 51}` : "4";
	const length = type === "American Express" ? 15 : 16;
	const body = `${prefix}${randomCharacters(DIGITS, length - prefix.length - 1)}`;
	return {
		number: `${body}${luhnCheckDigit(body)}`,
		type,
	};
}

function createIban(countryCode: string) {
	const ibanCountry = normaliseIbanCountry(countryCode);
	const bban = createBban(ibanCountry);
	return `${ibanCountry}${ibanCheckDigits(ibanCountry, bban)}${bban}`;
}

function normaliseIbanCountry(countryCode: string) {
	switch (countryCode) {
		case "DE":
		case "ES":
		case "FR":
		case "GB":
		case "IT":
		case "NL":
			return countryCode;
		default:
			return "GB";
	}
}

function createBban(countryCode: "DE" | "ES" | "FR" | "GB" | "IT" | "NL") {
	switch (countryCode) {
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

function createPhone(localeData: LocaleData) {
	return `+${localeData.phoneCode} ${randomCharacters(DIGITS, 3)} ${randomCharacters(DIGITS, 3)} ${randomCharacters(DIGITS, 4)}`;
}

function citiesFor(locale: (typeof PERSON_LOCALES)[number]) {
	switch (locale) {
		case "de_DE":
			return ["Berlin", "Hamburg", "Munich", "Cologne"];
		case "es_ES":
			return ["Madrid", "Barcelona", "Valencia", "Seville"];
		case "fr_FR":
			return ["Paris", "Lyon", "Marseille", "Lille"];
		case "it_IT":
			return ["Rome", "Milan", "Turin", "Florence"];
		case "nl_NL":
			return ["Amsterdam", "Rotterdam", "Utrecht", "Eindhoven"];
		case "pl_PL":
			return ["Warsaw", "Krakow", "Gdansk", "Poznan"];
		case "pt_PT":
			return ["Lisbon", "Porto", "Braga", "Coimbra"];
		case "en_US":
			return ["Austin", "Chicago", "New York", "Portland", "Seattle"];
	}
}

function parseGender(input: string | undefined) {
	const normalised = input?.trim().toLowerCase();
	const gender = GENDERS.find((option) => option === normalised);
	return gender ?? randomChoice(GENDERS);
}

function parseLocale(input: string | undefined) {
	const normalised = input?.trim();
	return PERSON_LOCALES.find((option) => option === normalised) ?? "en_US";
}

function randomCoordinate(min: number, max: number) {
	return (min + (randomIntegerInRange(1_000_000) / 1_000_000) * (max - min)).toFixed(6);
}

function titleFor(gender: (typeof GENDERS)[number]) {
	return gender === "male" ? randomChoice(["Mr.", "Dr.", "Prof."]) : randomChoice(["Ms.", "Mrs.", "Dr.", "Prof."]);
}
