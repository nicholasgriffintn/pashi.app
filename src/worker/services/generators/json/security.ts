import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import {
	bytesToBase64Url,
	parseBoolean,
	parseCount,
	parseChoice,
	parseInteger,
	randomBytes,
	randomChoice,
	randomCharacters,
	randomIntegerBetween,
	randomIntegerInRange,
	shuffle,
	singleOrList,
} from "../../../utils/generation";
import { createRandomToken } from "../../../utils/crypto";
import { PASSPHRASE_WORDS } from "../data/words";
import { fieldsResult, textResult } from "./result";
import { createHashes } from "./security/hashes";
import { createJwtTokens } from "./security/jwt";
import { createEncryptionKeys } from "./security/keys";
import { createSshKeys } from "./security/ssh";
import { createOauthTokens, createSalts, createWebhookSecrets } from "./security/tokens";

const API_TOKEN_FORMATS = ["alphanumeric", "hex", "base64", "base64url"] as const;
const API_KEY_FORMATS = ["alphanumeric", "hex", "base64", "base64url", "uuid", "numeric"] as const;
const PASSWORD_CHARSETS = {
	lowercase: "abcdefghijklmnopqrstuvwxyz",
	numbers: "0123456789",
	symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
	uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
} as const;
const SIMILAR_PASSWORD_CHARACTERS = /[il1ILo0O]/g;
const PIN_DIGITS = "0123456789";

export async function createSecurityResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): Promise<JsonResult | undefined> {
	switch (generator.id) {
		case "api-key":
			return fieldsResult(generator, request.input, createApiKeys(request));
		case "api-token":
			return textResult(generator, request.input, createApiTokens(request));
		case "bearer-token":
			return textResult(generator, request.input, createBearerTokens(request));
		case "encryption-key":
			return fieldsResult(generator, request.input, await createEncryptionKeys(request));
		case "hash":
			return fieldsResult(generator, request.input, await createHashes(request));
		case "jwt-token":
			return fieldsResult(generator, request.input, await createJwtTokens(request));
		case "oauth-token":
			return fieldsResult(generator, request.input, createOauthTokens(request));
		case "password":
			return textResult(generator, request.input, createPasswords(request));
		case "passphrase":
			return textResult(generator, request.input, createPassphrases(request));
		case "pin":
			return textResult(generator, request.input, createPins(request));
		case "port-number":
			return textResult(generator, request.input, createPortNumbers(request));
		case "salt":
			return fieldsResult(generator, request.input, createSalts(request));
		case "ssh-key":
			return fieldsResult(generator, request.input, await createSshKeys(request));
		case "webhook-secret":
			return fieldsResult(generator, request.input, await createWebhookSecrets(request));
		default:
			return undefined;
	}
}

function createApiKeys(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 25);
	const includeSecret = parseBoolean(request.fields.includeSecret ?? request.fields.include_secret, false);

	if (includeSecret) {
		const keyLength = parseInteger(request.fields.keyLength ?? request.fields.key_length ?? "", 32, 8, 128);
		const secretLength = parseInteger(request.fields.secretLength ?? request.fields.secret_length ?? "", 64, 16, 256);
		const keyPrefix = sanitizePrefix(request.fields.keyPrefix ?? request.fields.key_prefix ?? "key_", 20);
		const secretPrefix = sanitizePrefix(request.fields.secretPrefix ?? request.fields.secret_prefix ?? "secret_", 20);
		return singleOrList(
			Array.from({ length: count }, () => ({
				apiKey: `${keyPrefix}${createRandomToken("alphanumeric", keyLength)}`,
				apiSecret: `${secretPrefix}${createRandomToken("base64url", secretLength)}`,
				format: "key-secret",
				keyLength: `${keyLength}`,
				secretLength: `${secretLength}`,
			})),
		);
	}

	const length = parseInteger(request.fields.length ?? request.input, 32, 8, 256);
	const format = parseChoice(request.fields.format, API_KEY_FORMATS, "alphanumeric");
	const prefix = sanitizePrefix(request.fields.prefix ?? "sk_", 20);
	return singleOrList(
		Array.from({ length: count }, () => ({
			apiKey: `${prefix}${createRandomToken(format, length)}`,
			format,
			length: `${format === "uuid" ? 36 : length}`,
		})),
	);
}

function createApiTokens(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 10, 25);
	const length = parseInteger(request.fields.length ?? "", 32, 16, 128);
	const format = parseChoice(request.fields.format, API_TOKEN_FORMATS, "alphanumeric");
	const prefix = sanitizePrefix(request.fields.prefix ?? "token_", 20);
	return singleOrList(
		Array.from({ length: count }, () => `${prefix}${createRandomToken(format, length)}`),
	);
}

function createPasswords(request: GeneratorRequest) {
	const length = parseInteger(request.fields.length ?? request.input, 16, 4, 128);
	const count = parseCount(request.fields.count ?? "", 5, 25);
	const charsets = passwordCharsets(request);
	return singleOrList(Array.from({ length: count }, () => createPassword(length, charsets)));
}

function createPassphrases(request: GeneratorRequest) {
	const wordCount = parseInteger(request.fields.wordCount ?? request.fields.word_count ?? request.input, 5, 3, 10);
	const count = parseCount(request.fields.count ?? "", 5, 25);
	const separator = sanitizeSeparator(request.fields.separator ?? "-");
	const capitalize = parseBoolean(request.fields.capitalize, false);
	const includeNumbers = parseBoolean(request.fields.includeNumbers ?? request.fields.include_numbers, false);
	return singleOrList(
		Array.from({ length: count }, () =>
			createPassphrase({
				capitalize,
				includeNumbers,
				separator,
				wordCount,
			}),
		),
	);
}

function createPins(request: GeneratorRequest) {
	const length = parseInteger(request.fields.length ?? request.input, 4, 4, 8);
	const count = parseCount(request.fields.count ?? "", 10, 100);
	const options = {
		excludeRepeating: parseBoolean(request.fields.excludeRepeating ?? request.fields.exclude_repeating, false),
		excludeSequential: parseBoolean(request.fields.excludeSequential ?? request.fields.exclude_sequential, false),
		uniqueDigits: parseBoolean(request.fields.uniqueDigits ?? request.fields.unique_digits, false),
	};
	return singleOrList(Array.from({ length: count }, () => createPin(length, options)));
}

function createToken(request: GeneratorRequest, fallbackBytes: number) {
	const bytes = parseInteger(request.fields.bytes ?? request.input, fallbackBytes, 8, 128);
	return bytesToBase64Url(randomBytes(bytes));
}

function passwordCharsets(request: GeneratorRequest) {
	const excludeSimilar = parseBoolean(request.fields.excludeSimilar, false);
	const customSymbols = request.fields.customSymbols?.trim().slice(0, 100) || PASSWORD_CHARSETS.symbols;
	const selected = [
		parseBoolean(request.fields.uppercase, true) ? PASSWORD_CHARSETS.uppercase : "",
		parseBoolean(request.fields.lowercase, true) ? PASSWORD_CHARSETS.lowercase : "",
		parseBoolean(request.fields.numbers, true) ? PASSWORD_CHARSETS.numbers : "",
		parseBoolean(request.fields.symbols, true) ? customSymbols : "",
	]
		.map((charset) => excludeSimilar ? charset.replace(SIMILAR_PASSWORD_CHARACTERS, "") : charset)
		.filter(Boolean);

	return selected.length > 0 ? selected : [PASSWORD_CHARSETS.uppercase, PASSWORD_CHARSETS.lowercase, PASSWORD_CHARSETS.numbers];
}

function createPassword(length: number, charsets: string[]) {
	const requiredCharacters = charsets.map((charset) => randomChoice([...charset]));
	const allCharacters = charsets.join("");
	const remainingLength = Math.max(0, length - requiredCharacters.length);
	const remainingCharacters = Array.from({ length: remainingLength }, () => randomChoice([...allCharacters]));
	return shuffle([...requiredCharacters, ...remainingCharacters]).join("");
}

function createPassphrase({
	capitalize,
	includeNumbers,
	separator,
	wordCount,
}: {
	capitalize: boolean;
	includeNumbers: boolean;
	separator: string;
	wordCount: number;
}) {
	const words = Array.from({ length: wordCount }, () => {
		const word = randomChoice(PASSPHRASE_WORDS);
		return capitalize ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word;
	});
	if (includeNumbers) {
		words.push(`${randomIntegerBetween(10, 999)}`);
	}

	return words.join(separator);
}

function createPin(
	length: number,
	options: {
		excludeRepeating: boolean;
		excludeSequential: boolean;
		uniqueDigits: boolean;
	},
) {
	for (let attempt = 0; attempt < 200; attempt += 1) {
		const pin = options.uniqueDigits ? createUniqueDigitPin(length) : randomCharacters(PIN_DIGITS, length);
		if (isAllowedPin(pin, options)) {
			return pin;
		}
	}

	throw new Error("Could not generate a PIN with the selected constraints.");
}

function createUniqueDigitPin(length: number) {
	return shuffle([...PIN_DIGITS]).slice(0, length).join("");
}

function isAllowedPin(
	pin: string,
	options: {
		excludeRepeating: boolean;
		excludeSequential: boolean;
		uniqueDigits: boolean;
	},
) {
	if (options.excludeRepeating && new Set(pin).size === 1) {
		return false;
	}

	if (options.excludeSequential && isSequentialPin(pin)) {
		return false;
	}

	return !options.uniqueDigits || new Set(pin).size === pin.length;
}

function isSequentialPin(pin: string) {
	const digits = [...pin].map((digit) => Number.parseInt(digit, 10));
	const ascending = digits.every((digit, index) => index === 0 || digit === digits[index - 1] + 1);
	const descending = digits.every((digit, index) => index === 0 || digit === digits[index - 1] - 1);
	return ascending || descending;
}

function createBearerTokens(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => `Bearer ${createToken(request, 48)}`));
}

function createPortNumber(request: GeneratorRequest) {
	const min = parseInteger(request.fields.min ?? "", 1024, 1, 65_535);
	const max = parseInteger(request.fields.max ?? "", 65_535, 1, 65_535);
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	return lower + randomIntegerInRange(upper - lower + 1);
}

function createPortNumbers(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => `${createPortNumber(request)}`));
}

function sanitizePrefix(value: string, maxLength: number) {
	return value.trim().replace(/[^a-zA-Z0-9._-]/g, "").slice(0, maxLength);
}

function sanitizeSeparator(value: string) {
	return value.slice(0, 5);
}
