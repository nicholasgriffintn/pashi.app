import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import {
	parseInteger,
	randomCharacters,
	randomChoice,
	randomIntegerInRange,
	slugify,
} from "../../../utils/generation";
import { fieldsResult } from "./result";

const FIRST_NAMES = [
	"Ada",
	"Amara",
	"Bea",
	"Caleb",
	"Dina",
	"Eli",
	"Grace",
	"Iris",
	"Jules",
	"Kai",
	"Lena",
	"Milo",
	"Nia",
	"Owen",
	"Rae",
	"Sam",
] as const;
const LAST_NAMES = [
	"Archer",
	"Blake",
	"Chen",
	"Diaz",
	"Ellis",
	"Foster",
	"Grant",
	"Hale",
	"Ito",
	"Jones",
	"Khan",
	"Lee",
	"Moore",
	"Nguyen",
	"Patel",
	"Stone",
] as const;
const STREETS = [
	"Arcade Road",
	"Beacon Street",
	"Circuit Lane",
	"Foundry Avenue",
	"Harbour Way",
	"Signal Street",
	"Vector Close",
	"Wave Terrace",
] as const;
const CITIES = [
	"Bristol",
	"Cardiff",
	"Edinburgh",
	"Leeds",
	"London",
	"Manchester",
	"Newcastle",
	"Nottingham",
] as const;
const COMPANIES = [
	"Arc Labs",
	"Beacon Works",
	"Circuit Studio",
	"Foundry Systems",
	"Signal Dynamics",
	"Vector Analytics",
] as const;

export function createPeopleResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	switch (generator.id) {
		case "person":
			return fieldsResult(generator, request.input, createPerson(request));
		default:
			return undefined;
	}
}

function createPerson(request: GeneratorRequest) {
	const locale = (request.fields.locale || "GB").trim().toUpperCase();
	const firstName = randomChoice(FIRST_NAMES);
	const lastName = randomChoice(LAST_NAMES);
	const fullName = `${firstName} ${lastName}`;
	const username = `${slugify(fullName)}${randomCharacters("0123456789", 3)}`;

	return {
		address: createAddress(locale),
		birthday: createBirthday(request),
		company: randomChoice(COMPANIES),
		email: `${username}@example.com`,
		name: fullName,
		phone: createPhone(locale),
		username,
	};
}

function createAddress(locale: string) {
	if (locale === "US") {
		return `${randomIntegerInRange(9000) + 100} ${randomChoice(STREETS)}, ${randomChoice(["Austin", "Chicago", "Portland", "Seattle"])}, ${randomChoice(["CA", "IL", "OR", "TX", "WA"])} ${randomIntegerInRange(90_000) + 10_000}`;
	}

	return `${randomIntegerInRange(190) + 10} ${randomChoice(STREETS)}, ${randomChoice(CITIES)}, ${createPostcode()}`;
}

function createPostcode() {
	return `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 2)}${randomIntegerInRange(90) + 10} ${randomIntegerInRange(9)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 2)}`;
}

function createPhone(locale: string) {
	if (locale === "US") {
		return `+1 (${randomIntegerInRange(800) + 200}) ${randomIntegerInRange(800) + 200}-${String(randomIntegerInRange(10_000)).padStart(4, "0")}`;
	}

	return `+44 7${randomCharacters("0123456789", 3)} ${randomCharacters("0123456789", 6)}`;
}

function createBirthday(request: GeneratorRequest) {
	const minAge = parseInteger(request.fields.minAge ?? "", 18, 0, 120);
	const maxAge = parseInteger(request.fields.maxAge ?? "", 65, 0, 120);
	const lower = Math.min(minAge, maxAge);
	const upper = Math.max(minAge, maxAge);
	const age = lower + randomIntegerInRange(upper - lower + 1);
	const date = new Date();
	date.setUTCFullYear(date.getUTCFullYear() - age);
	date.setUTCMonth(randomIntegerInRange(12));
	date.setUTCDate(randomIntegerInRange(28) + 1);
	return date.toISOString().slice(0, 10);
}
