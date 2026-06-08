import type { GeneratorTool, JsonResult } from "../types";
import type { GeneratorRequest } from "../request";
import {
	base64Encode,
	bytesToBase64,
	parseDate,
	parseLength,
	randomBytes,
	requireInput,
	sha256,
	slugify,
} from "../../../utils/generation";
import { fieldsResult, textResult } from "./result";

export async function createEngineeringResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): Promise<JsonResult | undefined> {
	const { input } = request;
	switch (generator.id) {
		case "base64":
			return textResult(generator, input, base64Encode(requireInput(input)));
		case "hash":
			return textResult(generator, input, await sha256(requireInput(input)));
		case "password":
			return textResult(generator, input, createPassword(parseLength(input, 24, 12, 64)));
		case "slug":
			return textResult(generator, input, slugify(requireInput(input)));
		case "timestamp":
			return fieldsResult(generator, input, createTimestamp(input));
		case "token":
			return textResult(generator, input, createToken(parseLength(input, 32, 8, 96)));
		case "url":
			return textResult(generator, input, encodeURIComponent(requireInput(input)));
		case "uuid":
			return textResult(generator, input, crypto.randomUUID());
		default:
			return undefined;
	}
}

function createTimestamp(input: string) {
	const date = parseDate(input);
	return {
		epochMilliseconds: `${date.getTime()}`,
		epochSeconds: `${Math.floor(date.getTime() / 1000)}`,
		iso: date.toISOString(),
		utc: date.toUTCString(),
	};
}

function createToken(length: number) {
	return bytesToBase64(randomBytes(length)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function createPassword(length: number) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=";
	return Array.from(randomBytes(length), (byte) => alphabet[byte % alphabet.length]).join("");
}
