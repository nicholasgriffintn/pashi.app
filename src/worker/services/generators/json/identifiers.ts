import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import {
	parseCount,
	parseInteger,
	randomCharacters,
	randomChoice,
	randomIntegerInRange,
	randomUnitInterval,
	singleOrList,
} from "../../../utils/generation";
import { fieldsResult, textResult } from "./result";

const HEX = "0123456789abcdef";
const DIGITS = "0123456789";
const USERNAME_ADJECTIVES = [
	"bright",
	"cosmic",
	"fast",
	"lunar",
	"neon",
	"quiet",
	"rapid",
	"sharp",
	"solar",
	"vector",
] as const;
const USERNAME_NOUNS = [
	"arcade",
	"bolt",
	"signal",
	"snap",
	"pixel",
	"orbit",
	"cipher",
	"relay",
	"wave",
	"zone",
] as const;
const COMPANY_PREFIXES = [
	"Arc",
	"Beacon",
	"Bright",
	"Circuit",
	"Foundry",
	"North",
	"Signal",
	"Vector",
	"Vertex",
	"Wave",
] as const;
const COMPANY_SUFFIXES = [
	"Analytics",
	"Design",
	"Dynamics",
	"Labs",
	"Logistics",
	"Networks",
	"Systems",
	"Works",
] as const;
const US_STATES = [
	"Alabama",
	"Alaska",
	"Arizona",
	"Arkansas",
	"California",
	"Colorado",
	"Connecticut",
	"Delaware",
	"Florida",
	"Georgia",
	"Hawaii",
	"Idaho",
	"Illinois",
	"Indiana",
	"Iowa",
	"Kansas",
	"Kentucky",
	"Louisiana",
	"Maine",
	"Maryland",
	"Massachusetts",
	"Michigan",
	"Minnesota",
	"Mississippi",
	"Missouri",
	"Montana",
	"Nebraska",
	"Nevada",
	"New Hampshire",
	"New Jersey",
	"New Mexico",
	"New York",
	"North Carolina",
	"North Dakota",
	"Ohio",
	"Oklahoma",
	"Oregon",
	"Pennsylvania",
	"Rhode Island",
	"South Carolina",
	"South Dakota",
	"Tennessee",
	"Texas",
	"Utah",
	"Vermont",
	"Virginia",
	"Washington",
	"West Virginia",
	"Wisconsin",
	"Wyoming",
] as const;
const ZODIAC_SIGNS = [
	"Aries",
	"Taurus",
	"Gemini",
	"Cancer",
	"Leo",
	"Virgo",
	"Libra",
	"Scorpio",
	"Sagittarius",
	"Capricorn",
	"Aquarius",
	"Pisces",
] as const;

export function createIdentifierResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	switch (generator.id) {
		case "card":
			return fieldsResult(generator, request.input, createCards(request));
		case "company":
			return textResult(generator, request.input, createCompanies(request));
		case "coordinates":
			return fieldsResult(generator, request.input, createCoordinateRecords(request));
		case "iban":
			return textResult(generator, request.input, createGbIbans(request));
		case "ipv4":
			return textResult(generator, request.input, createIpv4Addresses(request));
		case "ipv6":
			return textResult(generator, request.input, createIpv6Addresses(request));
		case "mac":
			return textResult(generator, request.input, createMacAddresses(request));
		case "minecraft-uuid":
			return fieldsResult(generator, request.input, createMinecraftUuids(request));
		case "phone":
			return textResult(generator, request.input, createPhoneNumbers(request));
		case "us-state":
			return textResult(generator, request.input, createUsStates(request));
		case "username":
			return textResult(generator, request.input, createUsernames(request));
		case "zodiac":
			return textResult(generator, request.input, createZodiacSigns(request));
		case "zip":
			return textResult(generator, request.input, createZipCodes(request));
		default:
			return undefined;
	}
}

function createTextList(request: GeneratorRequest, createValue: () => string) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, createValue));
}

function createRecordList(request: GeneratorRequest, createValue: () => Record<string, string>) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, createValue));
}

function createIpv4() {
	return Array.from({ length: 4 }, () => randomIntegerInRange(256)).join(".");
}

function createIpv6() {
	return Array.from({ length: 8 }, () => randomCharacters(HEX, 4)).join(":");
}

function createMacAddress() {
	const bytes = Array.from({ length: 6 }, () => randomIntegerInRange(256));
	bytes[0] = (bytes[0] | 0x02) & 0xfe;
	return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(":");
}

function createIpv4Addresses(request: GeneratorRequest) {
	return createTextList(request, createIpv4);
}

function createIpv6Addresses(request: GeneratorRequest) {
	return createTextList(request, createIpv6);
}

function createMacAddresses(request: GeneratorRequest) {
	return createTextList(request, createMacAddress);
}

function createPhoneNumber(request: GeneratorRequest) {
	const country = (request.fields.country || "US").trim().toUpperCase();
	if (country === "GB" || country === "UK") {
		return `+44 7${randomCharacters(DIGITS, 3)} ${randomCharacters(DIGITS, 6)}`;
	}

	return `+1 (${randomAreaCode()}) ${randomCharacters("23456789", 1)}${randomCharacters(DIGITS, 2)}-${randomCharacters(DIGITS, 4)}`;
}

function randomAreaCode() {
	return `${randomIntegerInRange(8) + 2}${randomIntegerInRange(8) + 2}${randomIntegerInRange(10)}`;
}

function createPhoneNumbers(request: GeneratorRequest) {
	return createTextList(request, () => createPhoneNumber(request));
}

function createUsername(request: GeneratorRequest) {
	const separator = request.fields.separator ?? "-";
	const suffixLength = parseInteger(request.fields.suffix ?? "", 3, 0, 8);
	const suffix = suffixLength > 0 ? `${separator}${randomCharacters(DIGITS, suffixLength)}` : "";
	return `${randomChoice(USERNAME_ADJECTIVES)}${separator}${randomChoice(USERNAME_NOUNS)}${suffix}`;
}

function createUsernames(request: GeneratorRequest) {
	return createTextList(request, () => createUsername(request));
}

function createCompanyName() {
	return `${randomChoice(COMPANY_PREFIXES)} ${randomChoice(COMPANY_SUFFIXES)} ${randomChoice(["Ltd", "Inc", "Group", "Studio"])}`;
}

function createCompanies(request: GeneratorRequest) {
	return createTextList(request, createCompanyName);
}

function createMinecraftUuid() {
	const uuid = crypto.randomUUID();
	return {
		compact: uuid.replaceAll("-", ""),
		uuid,
	};
}

function createMinecraftUuids(request: GeneratorRequest) {
	return createRecordList(request, createMinecraftUuid);
}

function createCoordinates() {
	const latitude = randomCoordinate(-90, 90);
	const longitude = randomCoordinate(-180, 180);
	return {
		latitude: latitude.toFixed(6),
		longitude: longitude.toFixed(6),
		pair: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
	};
}

function createCoordinateRecords(request: GeneratorRequest) {
	return createRecordList(request, createCoordinates);
}

function randomCoordinate(min: number, max: number) {
	return min + randomUnitInterval() * (max - min);
}

function createZipCode() {
	return `${randomIntegerInRange(90_000) + 10_000}`;
}

function createZipCodes(request: GeneratorRequest) {
	return createTextList(request, createZipCode);
}

function createUsStates(request: GeneratorRequest) {
	return createTextList(request, () => randomChoice(US_STATES));
}

function createZodiacSigns(request: GeneratorRequest) {
	return createTextList(request, () => randomChoice(ZODIAC_SIGNS));
}

function createCard(request: GeneratorRequest) {
	const brand = (request.fields.brand || "visa").trim().toLowerCase();
	const prefix = brand === "mastercard" ? `${randomIntegerInRange(5) + 51}` : "4";
	const length = brand === "amex" ? 15 : 16;
	const amexPrefix = randomChoice(["34", "37"]);
	const bodyPrefix = brand === "amex" ? amexPrefix : prefix;
	const body = `${bodyPrefix}${randomCharacters(DIGITS, length - bodyPrefix.length - 1)}`;
	const number = `${body}${luhnCheckDigit(body)}`;
	return {
		brand: brand === "amex" ? "American Express" : brand === "mastercard" ? "Mastercard" : "Visa",
		cvv: randomCharacters(DIGITS, brand === "amex" ? 4 : 3),
		expiry: `${String(randomIntegerInRange(12) + 1).padStart(2, "0")}/${randomIntegerInRange(6) + 27}`,
		number,
	};
}

function createCards(request: GeneratorRequest) {
	return createRecordList(request, () => createCard(request));
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

function createGbIban() {
	const bank = randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 4).toUpperCase();
	const sortCode = randomCharacters(DIGITS, 6);
	const account = randomCharacters(DIGITS, 8);
	const bban = `${bank}${sortCode}${account}`;
	const check = ibanCheckDigits("GB", bban);
	return `GB${check}${bban}`;
}

function createGbIbans(request: GeneratorRequest) {
	return createTextList(request, createGbIban);
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
