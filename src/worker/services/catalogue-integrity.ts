import { listConverterTools } from "./converters/catalogue";
import { listGeneratorTools } from "./generators/catalogue";

function identifiersFor(tool: { aliases: readonly string[]; id: string }) {
	return [...new Set([tool.id, ...tool.aliases])];
}

export function findDuplicateToolIdentifiers() {
	const owners = new Map<string, string>();
	const duplicates: string[] = [];
	const tools = [
		...listGeneratorTools().map((tool) => ({ kind: "generator", tool })),
		...listConverterTools().map((tool) => ({ kind: "converter", tool })),
	];

	for (const { kind, tool } of tools) {
		for (const identifier of identifiersFor(tool)) {
			const owner = owners.get(identifier);

			if (owner) {
				duplicates.push(`${identifier} (${owner} and ${kind} ${tool.id})`);

				continue;
			}

			owners.set(identifier, `${kind} ${tool.id}`);
		}
	}

	return duplicates;
}

export function assertUniqueToolIdentifiers() {
	const duplicates = findDuplicateToolIdentifiers();

	if (duplicates.length > 0) {
		throw new Error(`Duplicate tool identifiers: ${duplicates.join(", ")}`);
	}
}
