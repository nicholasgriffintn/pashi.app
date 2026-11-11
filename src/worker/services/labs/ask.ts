import { isRecord } from "../../../shared/records";
import { runAiObject, type AiClient } from "../../ai/run";
import { TOOL_ROUTE_MAX_FIELDS } from "../../ai/schemas";
import { converterRatePolicy, generatorRatePolicy } from "../../mcp/toolkit";
import { matchOption } from "../../utils/generation";
import { readJsonBody } from "../../utils/http";
import { truncateText } from "../../utils/text";
import { listConverterTools } from "../converters/catalogue";
import type { ConversionEnv } from "../converters/conversion-pipeline";
import { createConverterResponse } from "../converters/response";
import type { ConverterTool } from "../converters/types";
import { recordEvent } from "../events";
import { listGeneratorTools } from "../generators/catalogue";
import { createGeneratorRequest, type GeneratorRequest } from "../generators/request";
import { createGeneratorResponse } from "../generators/response";
import type { GeneratorTool } from "../generators/types";

export const ASK_REQUEST_MAX_LENGTH = 400;
export const ASK_RUN_CONFIDENCE_THRESHOLD = 0.7;

const MAX_FIELD_VALUE_LENGTH = 200;
const MAX_INPUT_LENGTH = 2000;
const MAX_REASON_LENGTH = 300;
const MAX_PROMPTED_OPTIONS = 12;

export interface ToolRoute {
	confidence: number;
	fields: Record<string, string>;
	input: string;
	path: string;
	reason: string;
	toolId: string;
	toolLabel: string;
	toolType: "converter" | "generator";
}

export interface AskAnswer extends ToolRoute {
	ran: boolean;
	result?: Record<string, unknown>;
}

interface RoutableField {
	id: string;
	options?: readonly string[];
}

interface RoutableTool {
	canRun: (request: GeneratorRequest) => boolean;
	description: string;
	fields: RoutableField[];
	id: string;
	label: string;
	path: string;
	run: (request: GeneratorRequest, env: ConversionEnv) => Promise<Response>;
	toolType: "converter" | "generator";
}

interface RoutePayload {
	confidence: number;
	fields: unknown[];
	input: string;
	reason: string;
	toolId: string;
}

const SYSTEM_PROMPT = [
	"You route a request to one Pashi tool.",
	"Choose the single tool from the supplied list whose id best matches what the person asked for.",
	"Only use field ids that the chosen tool lists.",
	"Every field value must be a string.",
	"When a field lists options, the value must be one of those options exactly.",
	"Set input only when the tool needs text to work on; otherwise use an empty string.",
	"Set confidence to how sure you are that this tool with these values does what was asked, and keep it low when you are guessing.",
	"Never invent a tool id.",
].join(" ");

function hasValue(value: string | undefined) {
	return Boolean(value?.trim());
}

function routableField(id: string, options: readonly string[] | undefined): RoutableField {
	return { id, options: options?.length ? options : undefined };
}

function routableGenerator(tool: GeneratorTool): RoutableTool {
	const fields = tool.input.fields ?? [];
	const requiredFieldIds = fields.filter((field) => field.required).map((field) => field.id);

	return {
		canRun: (request) =>
			tool.result.kind !== "image" &&
			generatorRatePolicy({ ...request, type: tool.id }) !== "expensive" &&
			(!tool.input.required ||
				hasValue(request.input) ||
				(requiredFieldIds.length > 0 &&
					requiredFieldIds.every((id) => hasValue(request.fields[id])))),
		description: tool.description,
		fields: fields.map((field) => routableField(field.id, field.options)),
		id: tool.id,
		label: tool.label,
		path: `/tools/${tool.id}`,
		run: (request, env) => createGeneratorResponse(tool.id, request, new URLSearchParams(), env),
		toolType: "generator",
	};
}

function routableConverter(tool: ConverterTool): RoutableTool {
	const fields = tool.api?.fields ?? [];
	const requiredFieldIds = fields
		.filter((field) => field.required && !field.defaultValue)
		.map((field) => field.id);

	return {
		canRun: (request) =>
			tool.runtime === "worker" &&
			tool.input.kind === "text" &&
			tool.api?.response === "json" &&
			converterRatePolicy({ type: tool.id }) !== "expensive" &&
			(!tool.input.required || hasValue(request.input)) &&
			requiredFieldIds.every((id) => hasValue(request.fields[id])),
		description: tool.description,
		fields: fields.map((field) => routableField(field.id, field.values)),
		id: tool.id,
		label: tool.label,
		path: `/tools/convert/${tool.id}`,
		run: (request, env) => createConverterResponse(tool.id, request, env),
		toolType: "converter",
	};
}

function routableTools(): RoutableTool[] {
	return [
		...listGeneratorTools().map(routableGenerator),
		...listConverterTools().map(routableConverter),
	];
}

function promptedField(field: RoutableField) {
	return field.options && field.options.length <= MAX_PROMPTED_OPTIONS
		? { id: field.id, options: field.options }
		: field.id;
}

function readRoutePayload(value: unknown): RoutePayload | undefined {
	if (
		!isRecord(value) ||
		typeof value.toolId !== "string" ||
		typeof value.input !== "string" ||
		typeof value.reason !== "string" ||
		typeof value.confidence !== "number" ||
		!Array.isArray(value.fields)
	) {
		return undefined;
	}

	return {
		confidence: value.confidence,
		fields: value.fields,
		input: value.input,
		reason: value.reason,
		toolId: value.toolId,
	};
}

function keptFieldValue(field: RoutableField, value: string) {
	return field.options
		? matchOption(field.options, value)
		: truncateText(value, MAX_FIELD_VALUE_LENGTH);
}

function readRouteFields(tool: RoutableTool, entries: unknown[]) {
	const declared = new Map(tool.fields.map((field) => [field.id, field]));

	return Object.fromEntries(
		entries.slice(0, TOOL_ROUTE_MAX_FIELDS).flatMap((entry): [string, string][] => {
			if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.value !== "string") {
				return [];
			}

			const field = declared.get(entry.id);
			const value = field ? keptFieldValue(field, entry.value) : undefined;

			return field && value !== undefined ? [[field.id, value]] : [];
		}),
	);
}

async function chooseTool(ai: AiClient, request: string) {
	const trimmed = request.trim();

	if (!trimmed) {
		throw new Error("Describe what you need first.");
	}

	if (trimmed.length > ASK_REQUEST_MAX_LENGTH) {
		throw new Error(`Keep the request under ${ASK_REQUEST_MAX_LENGTH} characters.`);
	}

	const tools = routableTools();
	const catalogue = tools.map((tool) => ({
		description: tool.description,
		fields: tool.fields.map(promptedField),
		id: tool.id,
		label: tool.label,
	}));

	const payload = await runAiObject(
		ai,
		"route",
		[
			{ content: SYSTEM_PROMPT, role: "system" },
			{ content: JSON.stringify({ request: trimmed, tools: catalogue }), role: "user" },
		],
		readRoutePayload,
	);

	const tool = tools.find((candidate) => candidate.id === payload.toolId);

	if (!tool) {
		throw new Error("Could not match that to a Pashi tool. Try naming the format you want.");
	}

	const route: ToolRoute = {
		confidence: Number.isFinite(payload.confidence)
			? Math.min(1, Math.max(0, payload.confidence))
			: 0,
		fields: readRouteFields(tool, payload.fields),
		input: truncateText(payload.input, MAX_INPUT_LENGTH),
		path: tool.path,
		reason: truncateText(payload.reason, MAX_REASON_LENGTH),
		toolId: tool.id,
		toolLabel: tool.label,
		toolType: tool.toolType,
	};

	return { route, tool };
}

async function runRoutedTool(tool: RoutableTool, route: ToolRoute, env: ConversionEnv) {
	const request = createGeneratorRequest(route.input, route.fields);

	if (route.confidence < ASK_RUN_CONFIDENCE_THRESHOLD || !tool.canRun(request)) {
		return undefined;
	}

	const startedAt = Date.now();
	let result: Record<string, unknown> | undefined;

	try {
		const response = await tool.run(request, env);
		const body = response.ok ? await readJsonBody(response) : undefined;

		result = isRecord(body) ? body : undefined;
	} catch (error) {
		console.error("pashi.ask_run_failed", error);
	}

	recordEvent(env, {
		durationMs: Date.now() - startedAt,
		name: "tool_run",
		outcome: result ? "ok" : "error",
		toolId: tool.id,
		toolType: tool.toolType,
	});

	return result;
}

export async function routeRequestToTool(ai: AiClient, request: string): Promise<ToolRoute> {
	const { route } = await chooseTool(ai, request);

	return route;
}

export async function askPashi(
	ai: AiClient,
	request: string,
	env: ConversionEnv,
): Promise<AskAnswer> {
	const startedAt = Date.now();
	const { route, tool } = await chooseTool(ai, request);

	recordEvent(env, {
		durationMs: Date.now() - startedAt,
		kind: "ask",
		name: "ai_call",
		toolId: route.toolId,
	});

	const result = await runRoutedTool(tool, route, env);

	return result ? { ...route, ran: true, result } : { ...route, ran: false };
}
