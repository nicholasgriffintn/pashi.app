import type { GeneratorRequest } from "../../request";
import {
	parseBoolean,
	parseChoice,
	parseCount,
	parseInteger,
	randomCharacters,
	randomChoice,
	singleOrList,
	slugify,
} from "../../../../utils/generation";

const USERNAME_STYLES = ["professional", "gamer", "quirky", "simple", "cool", "mixed"] as const;
const ACTIVE_USERNAME_STYLES = ["professional", "gamer", "quirky", "simple", "cool"] as const;
const FIRST_NAMES = ["alex", "sam", "jordan", "casey", "taylor", "morgan", "riley", "jamie", "avery", "quinn"] as const;
const LAST_NAMES = ["smith", "wilson", "parker", "stone", "reed", "carter", "blake", "foster", "grant", "hale"] as const;
const GAMER_PREFIXES = ["Shadow", "Dragon", "Neon", "Nova", "Cyber", "Pixel", "Storm", "Blaze", "Ghost", "Vortex"] as const;
const GAMER_NOUNS = ["Hunter", "Slayer", "Ranger", "Knight", "Pilot", "Runner", "Striker", "Mage", "Ninja", "Rider"] as const;
const QUIRKY_WORDS = ["Pizza", "Coffee", "Waffle", "Banana", "Otter", "Moon", "Bubble", "Toast", "Mango", "Comet"] as const;
const COOL_PREFIXES = ["neon", "pixel", "lunar", "signal", "vector", "rapid", "cosmic", "solar", "quiet", "sharp"] as const;
const COOL_NOUNS = ["wave", "vibe", "orbit", "relay", "snap", "cipher", "zone", "bolt", "arcade", "signal"] as const;
const DIGITS = "0123456789";

export function createUsernames(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 10, 100);
	const style = parseChoice(request.fields.style, USERNAME_STYLES, "mixed");
	const minLength = parseInteger(request.fields.minLength ?? request.fields.min_length ?? "", 6, 3, 20);
	const maxLength = parseInteger(request.fields.maxLength ?? request.fields.max_length ?? "", 15, 3, 20);
	const includeNumbers = parseBoolean(request.fields.includeNumbers ?? request.fields.include_numbers, true);
	const unique = parseBoolean(request.fields.unique, true);
	const lengthRange = {
		max: Math.max(minLength, maxLength),
		min: Math.min(minLength, maxLength),
	};

	if (!unique) {
		return singleOrList(Array.from({ length: count }, () => createUsername(style, lengthRange, includeNumbers)));
	}

	const usernames = new Set<string>();
	let attempts = 0;

	while (usernames.size < count && attempts < count * 40) {
		usernames.add(createUsername(style, lengthRange, includeNumbers));
		attempts += 1;
	}

	return singleOrList([...usernames]);
}

function createUsername(
	style: (typeof USERNAME_STYLES)[number],
	lengthRange: { max: number; min: number },
	includeNumbers: boolean,
) {
	const selectedStyle = style === "mixed" ? randomChoice(ACTIVE_USERNAME_STYLES) : style;
	const base = usernameBase(selectedStyle);
	const suffix = includeNumbers ? randomCharacters(DIGITS, randomChoice([2, 3, 4])) : "";
	return fitUsername(`${base}${suffix}`, lengthRange, includeNumbers);
}

function usernameBase(style: (typeof ACTIVE_USERNAME_STYLES)[number]) {
	switch (style) {
		case "cool":
			return `${randomChoice(COOL_PREFIXES)}${randomChoice(COOL_NOUNS)}`;
		case "gamer":
			return `${randomChoice(GAMER_PREFIXES)}${randomChoice(GAMER_NOUNS)}`;
		case "professional":
			return `${randomChoice(FIRST_NAMES)}.${randomChoice(LAST_NAMES)}`;
		case "quirky":
			return `${randomChoice(QUIRKY_WORDS)}${randomChoice(["Fan", "Lover", "Cat", "Wizard", "Pilot"])}`;
		case "simple":
			return `user${randomCharacters(DIGITS, 4)}`;
	}
}

function fitUsername(value: string, lengthRange: { max: number; min: number }, includeNumbers: boolean) {
	let username = slugify(value).replaceAll("-", "_");

	if (username.length > lengthRange.max) {
		username = username.slice(0, lengthRange.max);
	}

	while (username.length < lengthRange.min) {
		username += includeNumbers ? randomChoice([...DIGITS]) : randomChoice(["x", "z", "q"]);
	}

	return username;
}
