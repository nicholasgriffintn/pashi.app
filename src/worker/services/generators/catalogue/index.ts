import type { Audience, GeneratorInputField, GeneratorTool, ResultKind } from "../types";

const CATEGORY_LABELS: Record<Audience, string> = {
	Design: "Design",
	Engineering: "Code",
	Gaming: "Gaming",
	Geographic: "Geographic",
	Identifiers: "Identifiers",
	Product: "Product",
	Random: "Random",
	TestData: "Test data",
	Tools: "Tools",
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
	tool("ipv4", "IPv4 address", "Identifiers", "Random IPv4 address.", "Input", false, "", "text", "Generate IPv4", ["public-ish address"]),
	tool("ipv6", "IPv6 address", "Identifiers", "Random IPv6 address.", "Input", false, "", "text", "Generate IPv6", ["full address"]),
	tool("mac", "MAC address", "Identifiers", "Random locally administered MAC address.", "Input", false, "", "text", "Generate MAC", ["device address"]),
	tool("phone", "Phone number", "Identifiers", "Random formatted phone number.", "Country", false, "US", "text", "Generate phone", ["US", "GB"], [
		field("country", "Country", "US", false),
	]),
	tool("username", "Username", "Identifiers", "Random readable username.", "Input", false, "", "text", "Generate username", ["neon-snap"], [
		field("separator", "Separator", "-", false),
		field("suffix", "Suffix digits", "3", false),
	]),
	tool("number", "Number", "Random", "Random integer in a range.", "Range", false, "1-100", "text", "Generate number", ["1-100", "0-999"], [
		field("min", "Min", "1", true),
		field("max", "Max", "100", true),
	]),
	tool("string", "String", "Random", "Random string from a chosen alphabet.", "Length", false, "16", "text", "Generate string", ["16", "32"], [
		field("length", "Length", "16", true),
		field("alphabet", "Alphabet", "alphanumeric", false),
	]),
	tool("pin", "PIN code", "Random", "Numeric PIN code.", "Length", false, "6", "text", "Generate PIN", ["4", "6"], [
		field("length", "Length", "6", true),
	]),
	tool("passphrase", "Passphrase", "Random", "Memorable random word passphrase.", "Words", false, "4", "text", "Generate phrase", ["4", "6"], [
		field("words", "Words", "4", true),
		field("separator", "Separator", "-", false),
	]),
	tool("colour", "Colour", "Design", "Random hexadecimal colour values.", "Count", false, "1", "palette", "Generate colour", ["1", "5"], [
		field("count", "Count", "1", true),
	]),
	tool("palette", "Palette", "Design", "Seeded five-colour palette.", "Input", false, "Cyber citrus checkout", "palette", "Make palette", ["Cyber citrus checkout", "Neon ink docs"]),
	tool("lorem", "Microcopy", "Design", "Practical UI copy set.", "Surface", false, "Checkout empty state", "fields", "Write copy", ["Checkout empty state", "Upload error"], [
		field("surface", "Surface", "Checkout empty state", true),
		field("audience", "Audience", "New customer", false),
		field("tone", "Tone", "Calm and direct", false),
	]),
	tool("utm", "UTM link", "Product", "Campaign URL with UTM tags.", "URL", false, "https://nicholasgriffin.dev/pricing", "text", "Build UTM", ["https://nicholasgriffin.dev/pricing", "https://pashi.app"], [
		field("url", "URL", "https://example.com/pricing", true),
		field("source", "Source", "newsletter", true),
		field("medium", "Medium", "email", true),
		field("campaign", "Campaign", "launch", true),
	]),
	tool("user-story", "User story", "Product", "Product story with context.", "Feature", false, "Team invites", "fields", "Write story", ["Team invites", "Export history"], [
		field("feature", "Feature", "Team invites", true),
		field("persona", "Persona", "workspace admin", true),
		field("outcome", "Outcome", "add teammates without support", true),
	]),
	tool("release", "Release note", "Product", "Release note draft.", "Change", false, "Faster QR generation", "fields", "Draft release", ["Faster QR generation", "New token tool"], [
		field("change", "Change", "Faster QR generation", true),
		field("audience", "Audience", "engineering teams", false),
		field("impact", "Impact", "ship shareable assets faster", false),
	]),
	tool("acceptance", "Criteria", "Product", "Acceptance criteria.", "Feature", false, "QR download button", "fields", "Write criteria", ["QR download button", "Password length setting"], [
		field("feature", "Feature", "QR download button", true),
		field("success", "Success", "the file downloads in the selected format", true),
		field("failure", "Failure", "show a clear error without clearing the form", false),
	]),
	tool("coordinates", "Coordinates", "Geographic", "Random latitude and longitude.", "Input", false, "", "fields", "Generate coords", ["lat/lng"]),
	tool("zip", "ZIP code", "Geographic", "Random US ZIP code.", "Input", false, "", "text", "Generate ZIP", ["90210"]),
	tool("card", "Card number", "TestData", "Luhn-valid test card details.", "Brand", false, "visa", "fields", "Generate card", ["visa", "mastercard"], [
		field("brand", "Brand", "visa", false),
	]),
	tool("iban", "IBAN", "TestData", "Valid-format GB IBAN for testing.", "Input", false, "", "text", "Generate IBAN", ["GB account"]),
	tool("dice", "Dice", "Gaming", "Roll any number of dice with any side count.", "Dice", false, "2d6", "fields", "Roll dice", ["2d6", "1d20"], [
		field("dice", "Dice", "2", true),
		field("sides", "Sides", "6", true),
	]),
	tool("coinflip", "Coin flip", "Gaming", "Random heads or tails.", "Input", false, "", "text", "Flip coin", ["heads or tails"]),
	tool("pick", "Name picker", "Tools", "Pick one item from a comma or newline list.", "Items", true, "Ada, Grace, Margaret", "text", "Pick one", ["Ada, Grace, Margaret"], [
		field("items", "Items", "Ada, Grace, Margaret", true),
	]),
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
	fields?: readonly GeneratorInputField[],
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
		input: { fields, label: inputLabel, required },
		label,
		placeholder,
		result: { kind: resultKind },
	};
}

function field(
	id: string,
	label: string,
	placeholder: string,
	required: boolean,
): GeneratorInputField {
	return { id, label, placeholder, required };
}
