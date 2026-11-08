import type { AiClient } from "../ai/run";
import type { PolicyName } from "../security/policies";
import { listConverterTools } from "../services/converters/catalogue";
import type { ConversionEnv } from "../services/converters/conversion-pipeline";
import { createConverterResponse } from "../services/converters/response";
import { listGeneratorTools } from "../services/generators/catalogue";
import { createGeneratorRequest } from "../services/generators/request";
import { createGeneratorResponse } from "../services/generators/response";
import {
	MCP_VIEW_URIS,
	POLYCHAT_APP_META_KEY,
	type McpToolUiMeta,
	type PolychatAppMeta,
} from "./apps";
import { CHARADES_DECKS, setUpCharades } from "./charades";
import { judgeCharadesClip } from "./charades-judge";
import { describeTool } from "./describe";
import { PHOTO_SORTER_LIMITS, setUpPhotoSorter, sortPhoto } from "./photo-sorter";
import {
	askTwentyQuestions,
	revealTwentyQuestions,
	setUpTwentyQuestions,
	startTwentyQuestions,
	TWENTY_QUESTIONS_QUESTION_LENGTH,
} from "./twenty-questions";
import { TWENTY_QUESTIONS_CATEGORIES } from "./twenty-questions-secrets";

export interface McpToolDefinition {
	_meta?: { [POLYCHAT_APP_META_KEY]?: PolychatAppMeta; ui: McpToolUiMeta };
	annotations: { readOnlyHint: boolean };
	description: string;
	inputSchema: Record<string, unknown>;
	name: string;
	ratePolicy: PolicyName;
}

const MCP_TOOLS: readonly McpToolDefinition[] = [
	{
		annotations: { readOnlyHint: true },
		description:
			"List the Pashi tools available, optionally filtered by a search term or category. Call this before pashi_generate or pashi_convert to find a tool id.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				kind: {
					description: "Restrict to generators or converters.",
					enum: ["all", "converter", "generator"],
					type: "string",
				},
				search: {
					description: "Match against tool ids, labels, descriptions and categories.",
					type: "string",
				},
			},
			type: "object",
		},
		name: "pashi_list_tools",
		ratePolicy: "read",
	},
	{
		_meta: { ui: { resourceUri: MCP_VIEW_URIS.generator } },
		annotations: { readOnlyHint: true },
		description:
			"Run a Pashi generator, such as uuid, password, dice or colour. Returns the generated result as JSON.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				fields: {
					additionalProperties: { type: "string" },
					description: "Tool specific options, for example count or format.",
					type: "object",
				},
				input: { description: "Optional seed or source text.", type: "string" },
				type: { description: "The generator id, for example uuid.", type: "string" },
			},
			required: ["type"],
			type: "object",
		},
		name: "pashi_generate",
		ratePolicy: "expensive",
	},
	{
		_meta: { ui: { resourceUri: MCP_VIEW_URIS.converter } },
		annotations: { readOnlyHint: true },
		description:
			"Run a Pashi text converter, such as markdown-to-jira, json-transform or timestamp-transform. Media and document conversion is not available over MCP.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				fields: {
					additionalProperties: { type: "string" },
					description: "Tool specific options, for example outputFormat.",
					type: "object",
				},
				input: { description: "The text to convert.", type: "string" },
				type: { description: "The converter id, for example markdown-to-jira.", type: "string" },
			},
			required: ["input", "type"],
			type: "object",
		},
		name: "pashi_convert",
		ratePolicy: "expensive",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Describe one Pashi generator or text converter: its input and the options it accepts, with labels and allowed values.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				type: { description: "The generator or converter id, for example uuid.", type: "string" },
			},
			required: ["type"],
			type: "object",
		},
		name: "pashi_describe_tool",
		ratePolicy: "read",
	},
	{
		_meta: {
			[POLYCHAT_APP_META_KEY]: {
				category: "play",
				description: "Act out a card on camera for six seconds and an AI audience guesses it.",
				name: "Charades",
			},
			ui: { resourceUri: MCP_VIEW_URIS.charades },
		},
		annotations: { readOnlyHint: true },
		description:
			"Open Charades: act out a card on camera for six seconds and an AI audience guesses which card it was. Opens a game view; the player does the acting.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				deck: {
					description: "The deck to start with. Leave empty to let the player choose.",
					enum: CHARADES_DECKS.map((deck) => deck.id),
					type: "string",
				},
			},
			type: "object",
		},
		name: "pashi_play_charades",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Judge one Charades performance. Called by the Charades view with the recorded clip; not useful from a conversation.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				card: { description: "Index of the card being acted in the deck.", type: "integer" },
				deck: { enum: CHARADES_DECKS.map((deck) => deck.id), type: "string" },
				video: { description: "A base64 video/webm or video/mp4 data URL.", type: "string" },
			},
			required: ["deck", "card", "video"],
			type: "object",
		},
		name: "pashi_judge_charades",
		ratePolicy: "read",
	},
	{
		_meta: {
			[POLYCHAT_APP_META_KEY]: {
				category: "play",
				description: "Name your piles, tip out up to 80 photos and an AI files each one.",
				name: "Photo Sorter",
			},
			ui: { resourceUri: MCP_VIEW_URIS.photoSorter },
		},
		annotations: { readOnlyHint: true },
		description:
			"Open Photo Sorter: the player names some piles, drops in up to 80 photos and an AI files each one, flagging faces, text, blur and screenshots. Opens a sorting view; the photos stay with the player.",
		inputSchema: { additionalProperties: false, properties: {}, type: "object" },
		name: "pashi_play_photo_sorter",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Sort one photo into one of the given piles. Called by the Photo Sorter view; not useful from a conversation.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				image: {
					description: `A base64 image/jpeg, image/png or image/webp data URL of at most ${PHOTO_SORTER_LIMITS.maxBytes / 1024 / 1024} MiB.`,
					type: "string",
				},
				piles: {
					items: {
						additionalProperties: false,
						properties: {
							description: { maxLength: PHOTO_SORTER_LIMITS.descriptionLength, type: "string" },
							id: { type: "string" },
							label: { maxLength: PHOTO_SORTER_LIMITS.labelLength, type: "string" },
						},
						required: ["id", "label"],
						type: "object",
					},
					maxItems: PHOTO_SORTER_LIMITS.maxPiles,
					minItems: PHOTO_SORTER_LIMITS.minPiles,
					type: "array",
				},
			},
			required: ["image", "piles"],
			type: "object",
		},
		name: "pashi_sort_photo",
		ratePolicy: "read",
	},
	{
		_meta: {
			[POLYCHAT_APP_META_KEY]: {
				category: "play",
				description: "An AI thinks of something. Twenty yes or no questions to find it.",
				name: "Twenty Questions",
			},
			ui: { resourceUri: MCP_VIEW_URIS.twentyQuestions },
		},
		annotations: { readOnlyHint: true },
		description:
			"Open Twenty Questions: an AI thinks of something and the player has twenty yes or no questions to find it. Opens a game view; the player asks the questions.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				category: {
					description: "The category to play. Leave empty to let the player choose.",
					enum: TWENTY_QUESTIONS_CATEGORIES.map((category) => category.id),
					type: "string",
				},
			},
			type: "object",
		},
		name: "pashi_play_twenty_questions",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Start a game of Twenty Questions and get its game token. Called by the Twenty Questions view.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				category: {
					enum: TWENTY_QUESTIONS_CATEGORIES.map((category) => category.id),
					type: "string",
				},
			},
			required: ["category"],
			type: "object",
		},
		name: "pashi_start_twenty_questions",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Ask one yes or no question, or make a guess, in a game of Twenty Questions. Called by the Twenty Questions view.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				question: {
					maxLength: TWENTY_QUESTIONS_QUESTION_LENGTH.max,
					minLength: TWENTY_QUESTIONS_QUESTION_LENGTH.min,
					type: "string",
				},
				token: { description: "The game token from pashi_start_twenty_questions.", type: "string" },
			},
			required: ["token", "question"],
			type: "object",
		},
		name: "pashi_ask_twenty_questions",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Give up a game of Twenty Questions and reveal the secret. Called by the Twenty Questions view.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				token: { description: "The game token from pashi_start_twenty_questions.", type: "string" },
			},
			required: ["token"],
			type: "object",
		},
		name: "pashi_reveal_twenty_questions",
		ratePolicy: "read",
	},
];

export function listMcpTools() {
	return MCP_TOOLS.map(({ _meta, annotations, description, inputSchema, name }) => ({
		_meta,
		annotations,
		description,
		inputSchema,
		name,
	}));
}

export function mcpToolRatePolicy(name: string): PolicyName {
	return MCP_TOOLS.find((tool) => tool.name === name)?.ratePolicy ?? "expensive";
}

function stringFields(value: unknown): Record<string, string> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(value).flatMap(([key, item]) => (typeof item === "string" ? [[key, item]] : [])),
	);
}

function matchesSearch(haystack: string, search: string) {
	const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);

	return tokens.every((token) => haystack.toLowerCase().includes(token));
}

function listTools(argumentsValue: Record<string, unknown>) {
	const kind = typeof argumentsValue.kind === "string" ? argumentsValue.kind : "all";
	const search = typeof argumentsValue.search === "string" ? argumentsValue.search : "";
	const generators =
		kind === "converter"
			? []
			: listGeneratorTools().map((tool) => ({
					category: tool.display.category,
					description: tool.description,
					fields: (tool.input.fields ?? []).map((field) => field.id),
					id: tool.id,
					kind: "generator" as const,
					label: tool.label,
				}));
	const converters =
		kind === "generator"
			? []
			: listConverterTools()
					.filter((tool) => tool.runtime === "worker")
					.map((tool) => ({
						category: tool.display.category,
						description: tool.description,
						fields: (tool.api?.fields ?? []).map((field) => field.id),
						id: tool.id,
						kind: "converter" as const,
						label: tool.label,
					}));

	const tools = [...generators, ...converters].filter((tool) =>
		search
			? matchesSearch(`${tool.id} ${tool.label} ${tool.description} ${tool.category}`, search)
			: true,
	);

	return { count: tools.length, tools };
}

export async function callMcpTool(
	name: string,
	argumentsValue: Record<string, unknown>,
	env: ConversionEnv,
	ai?: AiClient,
): Promise<unknown> {
	if (name === "pashi_list_tools") {
		return listTools(argumentsValue);
	}

	if (name === "pashi_play_charades") {
		return setUpCharades(argumentsValue);
	}

	if (name === "pashi_judge_charades") {
		return judgeCharadesClip(argumentsValue, env, ai);
	}

	if (name === "pashi_play_photo_sorter") {
		return setUpPhotoSorter();
	}

	if (name === "pashi_sort_photo") {
		return sortPhoto(argumentsValue, env, ai);
	}

	if (name === "pashi_play_twenty_questions") {
		return setUpTwentyQuestions(argumentsValue);
	}

	if (name === "pashi_start_twenty_questions") {
		return startTwentyQuestions(argumentsValue, env, ai);
	}

	if (name === "pashi_ask_twenty_questions") {
		return askTwentyQuestions(argumentsValue, env, ai);
	}

	if (name === "pashi_reveal_twenty_questions") {
		return revealTwentyQuestions(argumentsValue, env, ai);
	}

	const type = typeof argumentsValue.type === "string" ? argumentsValue.type : "";
	const input = typeof argumentsValue.input === "string" ? argumentsValue.input : "";
	const fields = stringFields(argumentsValue.fields);

	if (!type) {
		throw new Error("A tool id is required.");
	}

	if (name === "pashi_describe_tool") {
		return describeTool(type);
	}

	if (name === "pashi_generate") {
		const response = await createGeneratorResponse(
			type,
			createGeneratorRequest(input, fields),
			new URLSearchParams(),
			env,
		);

		return response.json();
	}

	if (name === "pashi_convert") {
		const converter = listConverterTools().find((tool) => tool.id === type);

		if (converter?.runtime === "container") {
			throw new Error("Media and document conversion is not available over MCP.");
		}

		const response = await createConverterResponse(
			type,
			createGeneratorRequest(input, fields),
			env,
		);

		return response.json();
	}

	throw new Error(`Unknown tool: ${name}`);
}
