import type { Audience, GeneratorInputField, GeneratorTool, ResultKind } from "../types";
import { POKEMON_TYPES } from "../data/pokemon";

const CATEGORY_LABELS: Record<Audience, string> = {
	Design: "Design",
	Engineering: "Code",
	Gaming: "Gaming",
	Geographic: "Geographic",
	Identifiers: "Identifiers",
	People: "People",
	Product: "Product",
	Random: "Random",
	Security: "Security",
	Strings: "Text",
	TestData: "Test data",
	Tools: "Tools",
};
const NO_INPUT_TOOL_IDS = new Set([
	"coinflip",
	"company",
	"coordinates",
	"iban",
	"ipv4",
	"ipv6",
	"mac",
	"minecraft-seed",
	"minecraft-uuid",
	"ssh-key",
	"us-state",
	"uuid",
	"zodiac",
	"zip",
]);

export const GENERATOR_TOOLS: readonly GeneratorTool[] = [
	tool("qr", "QR image", "Engineering", "QR image for links and notes.", "Input", true, "https://pashi.app", "image", "generate QR", ["https://pashi.app", "https://nicholasgriffin.dev/docs"]),
	tool("barcode", "Barcode", "Engineering", "Code 128 barcode SVG.", "Value", true, "PASHI-12345", "image", "Generate barcode", ["PASHI-12345", "ORDER-2048"], [
		field("value", "Value", "PASHI-12345", true),
		field("height", "Height", "160", true),
		field("scale", "Scale", "2", true),
		field("text", "Text", "show", false, "select", ["show", "hide"]),
	]),
	tool("emoji-image", "Emoji image", "Design", "Square SVG emoji image.", "Emoji", false, "⚡", "image", "Generate image", ["⚡", "✨"], [
		field("emoji", "Emoji", "⚡", true),
		field("size", "Size", "512", true),
		field("background", "Background", "0d1024", true),
	]),
	tool("uuid", "UUID", "Engineering", "Random v4 IDs.", "Count", false, "1", "text", "Generate UUID", ["1", "10"], [
		field("count", "Count", "1", true),
	]),
	tool("token", "Token", "Engineering", "URL-safe random tokens.", "Length", false, "32", "text", "Generate token", ["32", "48"], [
		field("length", "Length", "32", true),
		field("count", "Count", "1", true),
	]),
	tool("password", "Password", "Engineering", "Strong random passwords.", "Length", false, "24", "text", "Generate password", ["24", "32"], [
		field("length", "Length", "24", true),
		field("count", "Count", "1", true),
	]),
	tool("hash", "Hash", "Engineering", "SHA digest with selectable algorithm.", "Input", true, "Text to hash", "text", "Hash it", ["hello world", "release-v1"], [
		field("value", "Text", "hello world", true, "textarea"),
		field("algorithm", "Algorithm", "SHA-256", true, "select", ["SHA-256", "SHA-384", "SHA-512", "SHA-1"]),
	]),
	tool("api-key", "API key", "Security", "Random API key with prefix.", "Prefix", false, "pk_live", "text", "Generate key", ["pk_live", "sk_test"], [
		field("prefix", "Prefix", "pk_live", false),
		field("bytes", "Bytes", "32", true),
		field("count", "Count", "1", true),
	]),
	tool("jwt-token", "JWT token", "Security", "Valid HS256 signed JWT with matching secret.", "Subject", false, "user_123", "fields", "Sign JWT", ["user_123"], [
		field("subject", "Subject", "user_123", true),
		field("issuer", "Issuer", "pashi", true),
		field("expiresIn", "Expires in seconds", "3600", true),
	]),
	tool("oauth-token", "OAuth token", "Security", "OAuth-style bearer access token.", "Bytes", false, "64", "text", "Generate OAuth", ["64"], [
		field("bytes", "Bytes", "64", true),
		field("count", "Count", "1", true),
	]),
	tool("webhook-secret", "Webhook secret", "Security", "Webhook signing secret.", "Bytes", false, "32", "text", "Generate secret", ["32"], [
		field("bytes", "Bytes", "32", true),
		field("count", "Count", "1", true),
	]),
	tool("encryption-key", "Encryption key", "Security", "Random key material in hex and base64url.", "Bits", false, "256", "fields", "Generate key", ["128", "256"], [
		field("bits", "Bits", "256", true, "select", ["128", "192", "256", "512"]),
	]),
	tool("salt", "Salt", "Security", "Random salt value.", "Bytes", false, "24", "text", "Generate salt", ["16", "24"], [
		field("bytes", "Bytes", "24", true),
		field("count", "Count", "1", true),
	]),
	tool("ssh-key", "Key pair", "Security", "Real ECDSA P-256 PEM key pair.", "Input", false, "", "fields", "Generate keys", ["ECDSA P-256"]),
	tool("bearer-token", "Bearer token", "Security", "Ready-to-paste bearer token header value.", "Bytes", false, "48", "text", "Generate bearer", ["48"], [
		field("bytes", "Bytes", "48", true),
		field("count", "Count", "1", true),
	]),
	tool("port-number", "Port number", "Security", "Random TCP/UDP port in a range.", "Range", false, "1024-65535", "text", "Generate port", ["1024-65535"], [
		field("min", "Min", "1024", true),
		field("max", "Max", "65535", true),
		field("count", "Count", "1", true),
	]),
	tool("base64", "Base64", "Engineering", "Base64 encode text.", "Input", true, "Text to encode", "text", "Encode", ["hello world", "{\"ok\":true}"]),
	tool("url", "URL encode", "Engineering", "URL encode text.", "Input", true, "Text or URL", "text", "Encode URL", ["hello world", "https://nicholasgriffin.dev/?q=hello world"]),
	tool("slug", "Slug", "Engineering", "Safe URL slug.", "Input", true, "Launch notes v2", "text", "Make slug", ["My Great Blog Post", "Launch notes v2"]),
	tool("timestamp", "Timestamp", "Engineering", "Epoch and ISO date values.", "Input", false, "Optional date or epoch", "fields", "Convert time", ["now", "2026-06-08"]),
	tool("date", "Date", "Engineering", "Random date in a range.", "Range", false, "2020-2030", "text", "Generate date", ["2020-01-01 to 2030-12-31"], [
		field("start", "Start", "2020-01-01", true),
		field("end", "End", "2030-12-31", true),
		field("format", "Format", "iso-date", false, "select", ["iso-date", "uk", "us"]),
		field("count", "Count", "1", true),
	]),
	tool("time", "Time", "Engineering", "Random time in a range.", "Range", false, "Any", "text", "Generate time", ["24h", "12h"], [
		field("start", "Start", "2000-01-01T00:00:00Z", false),
		field("end", "End", "2000-01-01T23:59:59Z", false),
		field("format", "Format", "24h", false, "select", ["24h", "12h"]),
		field("count", "Count", "1", true),
	]),
	tool("datetime", "Date/time", "Engineering", "Random date/time with useful formats.", "Range", false, "2020-2030", "fields", "Generate datetime", ["2020-2030"], [
		field("start", "Start", "2020-01-01T00:00:00Z", true),
		field("end", "End", "2030-12-31T23:59:59Z", true),
		field("count", "Count", "1", true),
	]),
	tool("ipv4", "IPv4 address", "Identifiers", "Random IPv4 addresses.", "Count", false, "1", "text", "Generate IPv4", ["1", "10"], [
		field("count", "Count", "1", true),
	]),
	tool("ipv6", "IPv6 address", "Identifiers", "Random IPv6 addresses.", "Count", false, "1", "text", "Generate IPv6", ["1", "10"], [
		field("count", "Count", "1", true),
	]),
	tool("mac", "MAC address", "Identifiers", "Random locally administered MAC addresses.", "Count", false, "1", "text", "Generate MAC", ["1", "10"], [
		field("count", "Count", "1", true),
	]),
	tool("phone", "Phone number", "Identifiers", "Random formatted phone number.", "Country", false, "US", "text", "Generate phone", ["US", "GB"], [
		field("country", "Country", "US", false),
		field("count", "Count", "1", true),
	]),
	tool("username", "Username", "Identifiers", "Random readable username.", "Input", false, "", "text", "Generate username", ["neon-snap"], [
		field("separator", "Separator", "-", false),
		field("suffix", "Suffix digits", "3", false),
		field("count", "Count", "1", true),
	]),
	tool("company", "Company name", "Identifiers", "Random company names.", "Count", false, "1", "text", "Generate company", ["1", "10"], [
		field("count", "Count", "1", true),
	]),
	tool("minecraft-uuid", "Minecraft UUID", "Identifiers", "Random Minecraft UUID formats.", "Count", false, "1", "fields", "Generate UUID", ["1", "10"], [
		field("count", "Count", "1", true),
	]),
	tool("us-state", "US state", "Geographic", "Random US states.", "Count", false, "1", "text", "Generate state", ["1", "5"], [
		field("count", "Count", "1", true),
	]),
	tool("zodiac", "Zodiac sign", "Identifiers", "Random zodiac signs.", "Count", false, "1", "text", "Generate sign", ["1", "5"], [
		field("count", "Count", "1", true),
	]),
	tool("person", "Person", "People", "Generated person test data.", "Locale", false, "GB", "fields", "Generate person", ["GB", "US"], [
		field("locale", "Locale", "GB", false, "select", ["GB", "US"]),
		field("minAge", "Min age", "18", true),
		field("maxAge", "Max age", "65", true),
		field("count", "Count", "1", true),
	]),
	tool("number", "Number", "Random", "Random integers or decimals in a range.", "Range", false, "1-100", "text", "Generate number", ["1-100", "0-1 decimal"], [
		field("min", "Min", "1", true),
		field("max", "Max", "100", true),
		field("mode", "Mode", "integer", true, "select", ["integer", "decimal"]),
		field("decimals", "Decimals", "4", true),
		field("count", "Count", "1", true),
	]),
	tool("hex-number", "Hex number", "Random", "Random hexadecimal number in a range.", "Range", false, "0-65535", "text", "Generate hex", ["0-65535"], [
		field("min", "Min", "0", true),
		field("max", "Max", "65535", true),
	]),
	tool("octal-number", "Octal number", "Random", "Random octal number in a range.", "Range", false, "0-65535", "text", "Generate octal", ["0-65535"], [
		field("min", "Min", "0", true),
		field("max", "Max", "65535", true),
	]),
	tool("fraction", "Fraction", "Random", "Random simplified fraction.", "Denominator", false, "12", "fields", "Generate fraction", ["12", "100"], [
		field("maxDenominator", "Max denominator", "12", true),
	]),
	tool("string", "String", "Random", "Random string from a chosen alphabet.", "Length", false, "16", "text", "Generate string", ["16", "32"], [
		field("length", "Length", "16", true),
		field("alphabet", "Alphabet", "alphanumeric", false, "select", ["alphanumeric", "letters", "numeric", "hex"]),
		field("count", "Count", "1", true),
	]),
	tool("emoji", "Emoji", "Strings", "Random emoji string.", "Count", false, "6", "text", "Generate emoji", ["6", "12"], [
		field("count", "Count", "6", true),
		field("separator", "Separator", "", false),
	]),
	tool("pin", "PIN code", "Random", "Numeric PIN code.", "Length", false, "6", "text", "Generate PIN", ["4", "6"], [
		field("length", "Length", "6", true),
		field("count", "Count", "1", true),
	]),
	tool("passphrase", "Passphrase", "Random", "Memorable random word passphrase.", "Words", false, "4", "text", "Generate phrase", ["4", "6"], [
		field("words", "Words", "4", true),
		field("separator", "Separator", "-", false),
		field("count", "Count", "1", true),
	]),
	tool("colour", "Colour", "Design", "Random hexadecimal colour values.", "Count", false, "1", "palette", "Generate colour", ["1", "5"], [
		field("count", "Count", "1", true),
	]),
	tool("palette", "Palette", "Design", "Seeded five-colour palette.", "Input", false, "Cyber citrus checkout", "palette", "Make palette", ["Cyber citrus checkout", "Neon ink docs"]),
	tool("lorem", "Lorem ipsum", "Design", "Placeholder copy with configurable length.", "Topic", false, "Pashi interface", "text", "Generate lorem", ["Pashi interface", "Checkout flow"], [
		field("topic", "Topic", "Pashi interface", false),
		field("paragraphs", "Paragraphs", "2", true),
		field("sentences", "Sentences each", "3", true),
	]),
	tool("utm", "UTM link", "Product", "Campaign URL with UTM tags.", "URL", false, "https://nicholasgriffin.dev/pricing", "text", "Build UTM", ["https://nicholasgriffin.dev/pricing", "https://pashi.app"], [
		field("url", "URL", "https://example.com/pricing", true),
		field("source", "Source", "newsletter", true),
		field("medium", "Medium", "email", true),
		field("campaign", "Campaign", "launch", true),
	]),
	tool("coordinates", "Coordinates", "Geographic", "Random latitude and longitude records.", "Count", false, "1", "fields", "Generate coords", ["1", "10"], [
		field("count", "Count", "1", true),
	]),
	tool("zip", "ZIP code", "Geographic", "Random US ZIP codes.", "Count", false, "1", "text", "Generate ZIP", ["1", "10"], [
		field("count", "Count", "1", true),
	]),
	tool("card", "Card number", "TestData", "Luhn-valid test card details.", "Brand", false, "visa", "fields", "Generate card", ["visa", "mastercard"], [
		field("brand", "Brand", "visa", false, "select", ["visa", "mastercard", "amex"]),
		field("count", "Count", "1", true),
	]),
	tool("iban", "IBAN", "TestData", "Valid-format GB IBANs for testing.", "Count", false, "1", "text", "Generate IBAN", ["1", "10"], [
		field("count", "Count", "1", true),
	]),
	tool("dice", "Dice", "Gaming", "Roll dice with notation, modifier, and multiple rolls.", "Notation", false, "1d6", "fields", "Roll dice", ["1d6", "2d20+5", "4d6 drop lowest"], [
		field("notation", "Notation", "1d6", true),
		field("rolls", "Rolls", "1", true),
	]),
	tool("dice-probability", "Dice probability", "Gaming", "Exact probability for dice notation and target.", "Notation", false, "2d6", "fields", "Calculate odds", ["2d6 >= 7", "4d6 drop lowest >= 12"], [
		field("notation", "Notation", "2d6", true),
		field("comparison", "Comparison", ">=", true, "select", [">=", ">", "=", "<=", "<"]),
		field("target", "Target", "7", true),
	]),
	tool("lottery", "Lottery", "Gaming", "Lottery numbers from a configurable range.", "Count", false, "6", "fields", "Generate lottery", ["6 from 1-59"], [
		field("count", "Count", "6", true),
		field("min", "Min", "1", true),
		field("max", "Max", "59", true),
	]),
	tool("minecraft-seed", "Minecraft seed", "Gaming", "Random signed 64-bit Minecraft seed.", "Input", false, "", "text", "Generate seed", ["world seed"]),
	tool("pokemon", "Pokemon", "Gaming", "Random Kanto Pokedex entries with type filtering.", "Type", false, "any", "text", "Generate Pokemon", ["any", "electric"], [
		field("type", "Type", "any", false, "select", POKEMON_TYPES),
		field("count", "Count", "1", true),
	]),
	tool("coinflip", "Coin flip", "Gaming", "Random heads or tails.", "Count", false, "1", "text", "Flip coin", ["1", "10"], [
		field("count", "Count", "1", true),
	]),
	tool("list-randomizer", "List randomizer", "Tools", "Shuffle a comma or newline list.", "Items", true, "Ada\nGrace\nMargaret", "text", "Shuffle list", ["Ada, Grace, Margaret"], [
		field("items", "Items", "Ada\nGrace\nMargaret", true, "textarea"),
	]),
	tool("yes-no", "Yes or no", "Tools", "Weighted yes/no decision.", "Chance", false, "50", "text", "Decide", ["50"], [
		field("yesWeight", "Yes chance", "50", true),
	]),
	tool("teams", "Teams", "Tools", "Split a list into balanced random teams.", "Items", true, "Ada\nGrace\nMargaret\nKatherine", "fields", "Make teams", ["Ada, Grace, Margaret, Katherine"], [
		field("items", "Items", "Ada\nGrace\nMargaret\nKatherine", true, "textarea"),
		field("teams", "Teams", "2", true),
	]),
	tool("secret-santa", "Secret Santa", "Tools", "Assign each person a different recipient.", "People", true, "Ada\nGrace\nMargaret", "fields", "Assign pairs", ["Ada, Grace, Margaret"], [
		field("items", "People", "Ada\nGrace\nMargaret", true, "textarea"),
	]),
	tool("name-picker", "Name picker", "Tools", "Pick one item from a comma or newline list.", "Items", true, "Ada\nGrace\nMargaret", "text", "Pick one", ["Ada, Grace, Margaret"], [
		field("items", "Items", "Ada\nGrace\nMargaret", true, "textarea"),
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
		input: {
			fields,
			label: inputLabel,
			mode: NO_INPUT_TOOL_IDS.has(id) ? "none" : "text",
			required,
		},
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
	type: GeneratorInputField["type"] = "text",
	options?: readonly string[],
): GeneratorInputField {
	return { id, label, options, placeholder, required, type };
}
