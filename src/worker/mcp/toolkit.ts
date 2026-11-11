import { isRecord } from "../../shared/records";
import type { AiClient } from "../ai/run";
import { isExpensiveGeneratorId, policyFor, type PolicyName } from "../security/policies";
import { findConverterTool } from "../services/converters/catalogue";
import type { ConversionEnv } from "../services/converters/conversion-pipeline";
import { createConverterResponse } from "../services/converters/response";
import { findGenerator } from "../services/generators/catalogue";
import { createGeneratorRequest, usesAiMode } from "../services/generators/request";
import { createGeneratorResponse } from "../services/generators/response";
import type { GeneratorTool } from "../services/generators/types";
import { normaliseFields } from "../utils/body";
import { bytesToBase64 } from "../utils/generation";
import { errorCodeForStatus, isErrorCode, mediaTypeOf, readJsonBody } from "../utils/http";
import { imageToolResult, jsonToolResult, McpToolError, type McpToolResult } from "./tool-result";

type ToolArguments = Record<string, unknown>;

function readToolId(argumentsValue: ToolArguments) {
	return typeof argumentsValue.type === "string" ? argumentsValue.type : "";
}

function readToolRequest(argumentsValue: ToolArguments) {
	return createGeneratorRequest(
		typeof argumentsValue.input === "string" ? argumentsValue.input : "",
		normaliseFields(argumentsValue.fields),
	);
}

export function requireToolId(argumentsValue: ToolArguments) {
	const type = readToolId(argumentsValue);

	if (!type) {
		throw new Error("A tool id is required.");
	}

	return type;
}

export function generatorRatePolicy(argumentsValue: ToolArguments): PolicyName {
	const generator = findGenerator(readToolId(argumentsValue));

	return policyFor({
		isAiMode:
			Boolean(generator?.modes?.includes("ai")) && usesAiMode(readToolRequest(argumentsValue)),
		isContainerRuntime: false,
		isExpensiveGenerator: generator ? isExpensiveGeneratorId(generator.id) : false,
		isUpload: false,
		method: "POST",
	});
}

export function converterRatePolicy(argumentsValue: ToolArguments): PolicyName {
	return policyFor({
		isAiMode: false,
		isContainerRuntime: findConverterTool(readToolId(argumentsValue))?.runtime === "container",
		isExpensiveGenerator: false,
		isUpload: false,
		method: "POST",
	});
}

async function requireOk(response: Response) {
	if (response.ok) {
		return response;
	}

	const body = await readJsonBody(response);
	const details = isRecord(body) ? body : {};

	throw new McpToolError(
		typeof details.error === "string" ? details.error : "The tool call failed.",
		isErrorCode(details.code) ? details.code : errorCodeForStatus(response.status),
	);
}

async function imageResult(generator: GeneratorTool, response: Response) {
	const mimeType = mediaTypeOf(response.headers);
	const summary = `${generator.label} generated as ${mimeType}.`;

	return imageToolResult(
		{ data: bytesToBase64(new Uint8Array(await response.arrayBuffer())), mimeType },
		summary,
		{
			generatedAt: response.headers.get("X-Generated-At") ?? undefined,
			kind: generator.result.kind,
			label: generator.label,
			mimeType,
			result: summary,
			type: generator.id,
		},
	);
}

export async function runGenerator(
	argumentsValue: ToolArguments,
	env: ConversionEnv,
	ai: AiClient | undefined,
): Promise<McpToolResult> {
	const type = requireToolId(argumentsValue);
	const response = await requireOk(
		await createGeneratorResponse(
			type,
			readToolRequest(argumentsValue),
			new URLSearchParams(),
			env,
			ai,
		),
	);
	const generator = findGenerator(type);

	return generator?.result.kind === "image"
		? imageResult(generator, response)
		: jsonToolResult(await response.json());
}

export async function runConverter(
	argumentsValue: ToolArguments,
	env: ConversionEnv,
): Promise<McpToolResult> {
	const type = requireToolId(argumentsValue);

	if (findConverterTool(type)?.runtime === "container") {
		throw new Error("Media and document conversion is not available over MCP.");
	}

	const response = await requireOk(
		await createConverterResponse(type, readToolRequest(argumentsValue), env),
	);

	return jsonToolResult(await response.json());
}
