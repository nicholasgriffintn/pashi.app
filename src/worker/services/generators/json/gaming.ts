import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import { KANTO_POKEMON, POKEMON_TYPES, type Pokemon } from "../data/pokemon";
import { parseInteger, randomIntegerInRange, shuffle } from "../../../utils/generation";
import { calculateDiceProbability } from "./dice";
import { fieldsResult, textResult } from "./result";

export function createGamingResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	switch (generator.id) {
		case "dice-probability":
			return fieldsResult(generator, request.input, calculateDiceProbability(request));
		case "lottery":
			return fieldsResult(generator, request.input, createLottery(request));
		case "minecraft-seed":
			return textResult(generator, request.input, createMinecraftSeed());
		case "pokemon":
			return textResult(generator, request.input, createPokemon(request));
		default:
			return undefined;
	}
}

function createLottery(request: GeneratorRequest) {
	const min = parseInteger(request.fields.min ?? "", 1, 0, 1_000_000);
	const max = parseInteger(request.fields.max ?? "", 59, 1, 1_000_000);
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	const available = upper - lower + 1;
	const count = parseInteger(request.fields.count ?? "", 6, 1, Math.min(100, available));
	const numbers = shuffle(Array.from({ length: available }, (_, index) => lower + index))
		.slice(0, count)
		.sort((left, right) => left - right);

	return {
		count: `${count}`,
		numbers: numbers.join(", "),
		range: `${lower}-${upper}`,
	};
}

function createMinecraftSeed() {
	const high = BigInt(randomIntegerInRange(0x1_0000_0000));
	const low = BigInt(randomIntegerInRange(0x1_0000_0000));
	const unsigned = (high << 32n) | low;
	const signed = unsigned > 0x7fff_ffff_ffff_ffffn ? unsigned - 0x1_0000_0000_0000_0000n : unsigned;
	return `${signed}`;
}

function createPokemon(request: GeneratorRequest) {
	const type = normalisePokemonType(request.fields.type);
	const pool = type === "any" ? KANTO_POKEMON : KANTO_POKEMON.filter((pokemon) => pokemon.types.includes(type));
	const count = parseInteger(request.fields.count ?? "", 1, 1, Math.min(100, pool.length));
	const entries = shuffle(pool).slice(0, count).map(formatPokemon);
	return entries.length === 1 ? entries[0] : entries;
}

function normalisePokemonType(value: string | undefined) {
	const type = value?.trim().toLowerCase();
	return POKEMON_TYPES.includes(type as (typeof POKEMON_TYPES)[number])
		? type as (typeof POKEMON_TYPES)[number]
		: "any";
}

function formatPokemon(pokemon: Pokemon) {
	return `#${String(pokemon.id).padStart(3, "0")} ${pokemon.name} - ${pokemon.types.join("/")}`;
}
