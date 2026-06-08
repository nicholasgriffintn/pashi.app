import type { Audience, GeneratorTool, ResultKind } from "../types";

const CATEGORY_LABELS: Record<Audience, string> = {
	Design: "Design",
	Engineering: "Code",
	Product: "Product",
};

export const GENERATOR_TOOLS: readonly GeneratorTool[] = [
	tool("qr", "QR image", "Engineering", "QR image for links and notes.", "Input", true, "https://pashi.app", "image", "generate QR", ["https://pashi.app", "https://nicholasgriffin.dev/docs"]),
	tool("uuid", "UUID", "Engineering", "Random v4 ID.", "Input", false, "Optional label", "text", "Generate UUID", ["session id", "trace id"]),
	tool("token", "Token", "Engineering", "URL-safe random token.", "Length", false, "32", "text", "Generate token", ["32", "48"]),
	tool("password", "Password", "Engineering", "Strong random password.", "Length", false, "24", "text", "Generate password", ["24", "32"]),
	tool("hash", "SHA-256", "Engineering", "SHA-256 digest.", "Input", true, "Text to hash", "text", "Hash it", ["hello world", "release-v1"]),
	tool("base64", "Base64", "Engineering", "Base64 encode text.", "Input", true, "Text to encode", "text", "Encode", ["hello world", "{\"ok\":true}"]),
	tool("url", "URL encode", "Engineering", "URL encode text.", "Input", true, "Text or URL", "text", "Encode URL", ["hello world", "https://nicholasgriffin.dev/?q=hello world"]),
	tool("slug", "Slug", "Engineering", "Safe URL slug.", "Input", true, "Launch notes v2", "text", "Make slug", ["My Great Blog Post", "Launch notes v2"]),
	tool("timestamp", "Timestamp", "Engineering", "Epoch and ISO date values.", "Input", false, "Optional date or epoch", "fields", "Convert time", ["now", "2026-06-08"]),
	tool("palette", "Palette", "Design", "Seeded five-colour palette.", "Input", false, "Cyber citrus checkout", "palette", "Make palette", ["Cyber citrus checkout", "Neon ink docs"]),
	tool("lorem", "Microcopy", "Design", "Practical UI copy set.", "Surface", false, "Checkout empty state", "fields", "Write copy", ["Checkout empty state", "Upload error"]),
	tool("utm", "UTM link", "Product", "Campaign URL with UTM tags.", "URL", false, "https://nicholasgriffin.dev/pricing", "text", "Build UTM", ["https://nicholasgriffin.dev/pricing", "https://pashi.app"]),
	tool("user-story", "User story", "Product", "Product story with context.", "Feature", false, "Team invites", "fields", "Write story", ["Team invites", "Export history"]),
	tool("release", "Release note", "Product", "Release note draft.", "Change", false, "Faster QR generation", "fields", "Draft release", ["Faster QR generation", "New token tool"]),
	tool("acceptance", "Criteria", "Product", "Acceptance criteria.", "Feature", false, "QR download button", "fields", "Write criteria", ["QR download button", "Password length setting"]),
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
	actionLabel: string,
	examples: readonly string[],
): GeneratorTool {
	return {
		audience,
		description,
		display: {
			actionLabel,
			category: CATEGORY_LABELS[audience],
			examples,
		},
		endpoint: `/api/${id}`,
		id,
		input: { label: inputLabel, required },
		label,
		placeholder,
		result: { kind: resultKind },
	};
}
