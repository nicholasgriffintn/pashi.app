import type { Audience, GeneratorTool, ResultKind } from "../types";

export const GENERATOR_TOOLS: readonly GeneratorTool[] = [
	tool("qr", "QR image", "Engineering", "QR image for links and notes.", "Input", true, "https://pashi.app", "image"),
	tool("uuid", "UUID", "Engineering", "Random v4 ID.", "Input", false, "Optional label", "text"),
	tool("token", "Token", "Engineering", "URL-safe random token.", "Length", false, "32", "text"),
	tool("password", "Password", "Engineering", "Strong random password.", "Length", false, "24", "text"),
	tool("hash", "SHA-256", "Engineering", "SHA-256 digest.", "Input", true, "Text to hash", "text"),
	tool("base64", "Base64", "Engineering", "Base64 encode text.", "Input", true, "Text to encode", "text"),
	tool("url", "URL encode", "Engineering", "URL encode text.", "Input", true, "Text or URL", "text"),
	tool("slug", "Slug", "Engineering", "Safe URL slug.", "Input", true, "Launch notes v2", "text"),
	tool("timestamp", "Timestamp", "Engineering", "Epoch and ISO date values.", "Input", false, "Optional date or epoch", "fields"),
	tool("palette", "Palette", "Design", "Seeded five-colour palette.", "Input", false, "Cyber citrus checkout", "palette"),
	tool("lorem", "Microcopy", "Design", "Practical UI copy set.", "Surface", false, "Checkout empty state", "fields"),
	tool("utm", "UTM link", "Product", "Campaign URL with UTM tags.", "URL", false, "https://example.com/pricing", "text"),
	tool("user-story", "User story", "Product", "Product story with context.", "Feature", false, "Team invites", "fields"),
	tool("release", "Release note", "Product", "Release note draft.", "Change", false, "Faster QR generation", "fields"),
	tool("acceptance", "Criteria", "Product", "Acceptance criteria.", "Feature", false, "QR download button", "fields"),
];

export function findGenerator(type: string) {
	return GENERATOR_TOOLS.find((generator) => generator.id === type);
}

export function listGeneratorTools() {
	return GENERATOR_TOOLS;
}

function tool(
	id: string,
	label: string,
	audience: Audience,
	description: string,
	inputLabel: string,
	required: boolean,
	placeholder: string,
	resultKind: ResultKind,
): GeneratorTool {
	return {
		audience,
		description,
		endpoint: `/api/${id}`,
		id,
		input: { label: inputLabel, required },
		label,
		placeholder,
		result: { kind: resultKind },
	};
}
