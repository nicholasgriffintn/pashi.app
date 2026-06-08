import type { GeneratorTool, JsonResult } from "../types";
import type { GeneratorRequest } from "../request";
import {
	base64Encode,
	bytesToBase64,
	createDigest,
	type DigestAlgorithm,
	parseDate,
	parseCount,
	parseLength,
	randomBytes,
	requireInput,
	singleOrList,
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
			return textResult(generator, input, await createHash(request));
		case "password":
			return textResult(generator, input, createPasswords(request));
		case "slug":
			return textResult(generator, input, slugify(requireInput(input)));
		case "timestamp":
			return fieldsResult(generator, input, createTimestamp(input));
		case "token":
			return textResult(generator, input, createTokens(request));
		case "url":
			return textResult(generator, input, encodeURIComponent(requireInput(input)));
		case "uuid":
			return textResult(generator, input, createUuids(request));
		default:
			return undefined;
	}
}

function createPasswords(request: GeneratorRequest) {
	const length = parseLength(request.fields.length ?? request.input, 24, 12, 64);
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => createPassword(length)));
}

function createTokens(request: GeneratorRequest) {
	const length = parseLength(request.fields.length ?? request.input, 32, 8, 96);
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => createToken(length)));
}

function createUuids(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? request.input, 1, 1000);
	return singleOrList(Array.from({ length: count }, () => crypto.randomUUID()));
}

function createHash(request: GeneratorRequest) {
	const value = request.fields.value?.trim() || requireInput(request.input);
	const algorithm = normaliseHashAlgorithm(request.fields.algorithm);
	return createDigest(value, algorithm);
}

function normaliseHashAlgorithm(value: string | undefined): DigestAlgorithm {
	switch (value) {
		case "SHA-1":
		case "SHA-384":
		case "SHA-512":
			return value;
		default:
			return "SHA-256";
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
