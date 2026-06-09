import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import {
	parseCount,
	randomChoice,
	singleOrList,
} from "../../../utils/generation";
import { fieldsResult, textResult } from "./result";
import { createCompanies } from "./identifiers/company";
import { createPhoneNumbers, createZipCodes } from "./identifiers/contact";
import { createIpAddresses, createIpv4Addresses, createIpv6Addresses, createMacAddresses } from "./identifiers/network";
import { createCards, createCoordinateRecords, createIbans } from "./identifiers/test-data";
import { createUsernames } from "./identifiers/usernames";

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
			return textResult(generator, request.input, createIbans(request));
		case "ip-address":
			return textResult(generator, request.input, createIpAddresses(request));
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

function createUsStates(request: GeneratorRequest) {
	return createTextList(request, () => randomChoice(US_STATES));
}

function createZodiacSigns(request: GeneratorRequest) {
	return createTextList(request, () => randomChoice(ZODIAC_SIGNS));
}
