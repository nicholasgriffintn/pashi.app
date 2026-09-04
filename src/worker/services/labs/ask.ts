import { runAiObject, type AiEnv } from "../../ai/run";
import { listConverterTools } from "../converters/catalogue";
import { listGeneratorTools } from "../generators/catalogue";

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

interface RoutableTool {
	description: string;
	fieldIds: string[];
	id: string;
	label: string;
	toolType: "converter" | "generator";
}

const SYSTEM_PROMPT = [
	"You route a request to one Pashi tool.",
	"Choose the single tool from the supplied list whose id best matches what the person asked for.",
	"Only use field ids that the chosen tool lists.",
	"Every field value must be a string.",
	"Set input only when the tool needs text to work on; otherwise use an empty string.",
	"Never invent a tool id.",
].join(" ");

function routableTools(): RoutableTool[] {
	return [
		...listGeneratorTools().map((tool) => ({
			description: tool.description,
			fieldIds: (tool.input.fields ?? []).map((field) => field.id),
			id: tool.id,
			label: tool.label,
			toolType: "generator" as const,
		})),
		...listConverterTools().map((tool) => ({
			description: tool.description,
			fieldIds: (tool.api?.fields ?? []).map((field) => field.id),
			id: tool.id,
			label: tool.label,
			toolType: "converter" as const,
		})),
	];
}

function isRoutePayload(value: unknown): value is {
	confidence: number;
	fields: { id: string; value: string }[];
	input: string;
	reason: string;
	toolId: string;
} {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const candidate = value as Record<string, unknown>;

	return (
		typeof candidate.toolId === "string" &&
		typeof candidate.input === "string" &&
		typeof candidate.reason === "string" &&
		typeof candidate.confidence === "number" &&
		Array.isArray(candidate.fields)
	);
}

export async function routeRequestToTool(env: AiEnv, request: string): Promise<ToolRoute> {
	const trimmed = request.trim();

	if (!trimmed) {
		throw new Error("Describe what you need first.");
	}

	if (trimmed.length > 400) {
		throw new Error("Keep the request under 400 characters.");
	}

	const tools = routableTools();
	const catalogue = tools.map((tool) => ({
		description: tool.description,
		fields: tool.fieldIds,
		id: tool.id,
		label: tool.label,
	}));

	const payload = await runAiObject(
		env,
		"route",
		[
			{ content: SYSTEM_PROMPT, role: "system" },
			{ content: JSON.stringify({ request: trimmed, tools: catalogue }), role: "user" },
		],
		(value) => (isRoutePayload(value) ? value : undefined),
	);

	const tool = tools.find((candidate) => candidate.id === payload.toolId);

	if (!tool) {
		throw new Error("Could not match that to a Pashi tool. Try naming the format you want.");
	}

	const allowedFields = new Set(tool.fieldIds);
	const fields = Object.fromEntries(
		payload.fields
			.filter(
				(field): field is { id: string; value: string } =>
					typeof field?.id === "string" &&
					typeof field?.value === "string" &&
					allowedFields.has(field.id),
			)
			.map((field) => [field.id, field.value]),
	);

	return {
		confidence: Math.min(1, Math.max(0, payload.confidence)),
		fields,
		input: payload.input,
		path: tool.toolType === "converter" ? `/tools/convert/${tool.id}` : `/tools/${tool.id}`,
		reason: payload.reason,
		toolId: tool.id,
		toolLabel: tool.label,
		toolType: tool.toolType,
	};
}
