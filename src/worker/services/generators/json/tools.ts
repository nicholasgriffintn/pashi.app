import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import {
	parseDelimitedList,
	parseInteger,
	randomIntegerInRange,
	shuffle,
} from "../../../utils/generation";
import { fieldsResult, textResult } from "./result";

export function createToolsResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	switch (generator.id) {
		case "list-randomizer":
			return textResult(generator, request.input, randomiseList(request).join("\n"));
		case "name-picker":
			return textResult(generator, request.input, pickListItem(request));
		case "secret-santa":
			return fieldsResult(generator, request.input, createSecretSanta(request));
		case "teams":
			return fieldsResult(generator, request.input, createTeams(request));
		case "yes-no":
			return textResult(generator, request.input, createYesNo(request));
		default:
			return undefined;
	}
}

function randomiseList(request: GeneratorRequest) {
	const items = parseItems(request);
	return shuffle(items);
}

function createYesNo(request: GeneratorRequest) {
	const yesWeight = parseInteger(request.fields.yesWeight ?? "", 50, 0, 100);
	return randomIntegerInRange(100) < yesWeight ? "Yes" : "No";
}

function pickListItem(request: GeneratorRequest) {
	const items = parseItems(request);
	return items[randomIntegerInRange(items.length)];
}

function createTeams(request: GeneratorRequest) {
	const members = shuffle(parseItems(request));
	const teamCount = parseInteger(request.fields.teams ?? "", 2, 2, Math.max(2, members.length));
	const teams: Array<{ members: string[]; name: string }> = Array.from(
		{ length: teamCount },
		(_, index) => ({ members: [], name: `Team ${index + 1}` }),
	);

	members.forEach((member, index) => {
		teams[index % teams.length].members.push(member);
	});

	return Object.fromEntries(teams.map((team) => [team.name, team.members.join(", ")]));
}

function createSecretSanta(request: GeneratorRequest) {
	const members = parseItems(request);
	if (members.length < 2) {
		throw new Error("Add at least two people.");
	}

	const donors = shuffle(members);
	const receivers = rotate(donors);
	return Object.fromEntries(donors.map((member, index) => [member, receivers[index]]));
}

function rotate<T>(items: readonly T[]) {
	return items.map((_, index) => items[(index + 1) % items.length]);
}

function parseItems(request: GeneratorRequest) {
	const items = parseDelimitedList(request.fields.items || request.input);
	if (items.length === 0) {
		throw new Error("Add at least one list item.");
	}

	return items;
}
