import type { GeneratorTool, JsonResult } from "../types";
import type { GeneratorRequest } from "../request";
import {
	base64Encode,
	bytesToBase64,
	parseCount,
	parseLength,
	randomBytes,
	randomDateInRange,
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
		case "slug":
			return textResult(generator, input, slugify(requireInput(input)));
		case "timestamp":
			return fieldsResult(generator, input, createTimestamps(request));
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

function createTokens(request: GeneratorRequest) {
	const length = parseLength(request.fields.length ?? request.input, 32, 8, 96);
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => createToken(length)));
}

function createUuids(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? request.input, 1, 1000);
	return singleOrList(Array.from({ length: count }, () => crypto.randomUUID()));
}

function createTimestamps(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 1000);
	return singleOrList(Array.from({ length: count }, () => createTimestamp(request)));
}

function createTimestamp(request: GeneratorRequest) {
	const date = randomDateInRange(
		request.fields.start || "2000-01-01T00:00:00.000Z",
		request.fields.end || "2030-12-31T23:59:59.999Z",
	);
	const unit = request.fields.unit === "milliseconds" ? "milliseconds" : "seconds";
	return {
		epochMilliseconds: `${date.getTime()}`,
		epochSeconds: `${Math.floor(date.getTime() / 1000)}`,
		iso: date.toISOString(),
		timestamp: unit === "milliseconds" ? `${date.getTime()}` : `${Math.floor(date.getTime() / 1000)}`,
		unit,
		utc: date.toUTCString(),
	};
}

function createToken(length: number) {
	return bytesToBase64(randomBytes(length)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
