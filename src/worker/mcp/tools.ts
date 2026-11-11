import { POLYCHAT_APP_META_KEY } from "../../shared/mcp-apps";
import { POLIS_DRAFT_LENGTH, POLIS_MAX_BUCKETS_PER_REQUEST } from "../../shared/polis";
import type { AiClient } from "../ai/run";
import type { PolicyName } from "../security/policies";
import { listConverterTools } from "../services/converters/catalogue";
import type { ConversionEnv } from "../services/converters/conversion-pipeline";
import { listGeneratorTools } from "../services/generators/catalogue";
import { MCP_VIEW_URIS, type McpToolUiMeta, type PolychatAppMeta } from "./apps";
import { CHARADES_DECKS, setUpCharades } from "./charades";
import { judgeCharadesClip } from "./charades-judge";
import { DESCRIBED_TOOL_OUTPUT_SCHEMA, describeTool } from "./describe";
import { PHOTO_SORTER_LIMITS, setUpPhotoSorter, sortPhoto } from "./photo-sorter";
import { decidePolisBuckets, draftPolisLaw, draftPolisScenario, setUpPolis } from "./polis";
import {
	deletePolisTown,
	getPolisTown,
	listPolisTowns,
	savePolisTown,
	sharePolisTown,
	stopSharingPolisTown,
} from "./polis-towns";
import { generateStrudelPattern, setUpStrudel, STRUDEL_LIMITS } from "./strudel";
import {
	deleteStrudelPattern,
	listStrudelPatterns,
	saveStrudelPattern,
	STRUDEL_PATTERN_LIMITS,
} from "./strudel-patterns";
import { STRUDEL_COMPLEXITIES, STRUDEL_STYLES } from "./strudel-prompts";
import { jsonToolResult, McpToolError, type McpToolResult } from "./tool-result";
import {
	converterRatePolicy,
	generatorRatePolicy,
	requireToolId,
	runConverter,
	runGenerator,
} from "./toolkit";
import {
	askTwentyQuestions,
	revealTwentyQuestions,
	setUpTwentyQuestions,
	startTwentyQuestions,
	TWENTY_QUESTIONS_QUESTION_LENGTH,
} from "./twenty-questions";
import { TWENTY_QUESTIONS_CATEGORIES } from "./twenty-questions-secrets";
import {
	checkVerbatimSegment,
	setUpVerbatim,
	transcribeVerbatimSegment,
	VERBATIM_LIMITS,
} from "./verbatim";

export interface McpToolDefinition {
	_meta?: { [POLYCHAT_APP_META_KEY]?: PolychatAppMeta; ui: McpToolUiMeta };
	annotations: { destructiveHint?: boolean; readOnlyHint: boolean };
	anonymous?: boolean;
	description: string;
	inputSchema: Record<string, unknown>;
	name: string;
	outputSchema?: Record<string, unknown>;
	ratePolicy: PolicyName | ((argumentsValue: Record<string, unknown>) => PolicyName);
}

const MCP_TOOLS: readonly McpToolDefinition[] = [
	{
		annotations: { readOnlyHint: true },
		anonymous: true,
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
		outputSchema: {
			additionalProperties: false,
			properties: {
				count: { type: "integer" },
				tools: {
					items: {
						additionalProperties: false,
						properties: {
							category: { type: "string" },
							description: { type: "string" },
							fields: { items: { type: "string" }, type: "array" },
							id: { type: "string" },
							kind: { enum: ["converter", "generator"], type: "string" },
							label: { type: "string" },
						},
						required: ["category", "description", "fields", "id", "kind", "label"],
						type: "object",
					},
					type: "array",
				},
			},
			required: ["count", "tools"],
			type: "object",
		},
		ratePolicy: "read",
	},
	{
		_meta: { ui: { resourceUri: MCP_VIEW_URIS.generator } },
		annotations: { readOnlyHint: true },
		anonymous: true,
		description:
			"Run a Pashi generator, such as uuid, password, dice or colour. Returns the result as JSON, or as an image for image generators such as qr.",
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
		ratePolicy: generatorRatePolicy,
	},
	{
		_meta: { ui: { resourceUri: MCP_VIEW_URIS.converter } },
		annotations: { readOnlyHint: true },
		anonymous: true,
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
		ratePolicy: converterRatePolicy,
	},
	{
		annotations: { readOnlyHint: true },
		anonymous: true,
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
		outputSchema: DESCRIBED_TOOL_OUTPUT_SCHEMA,
		ratePolicy: "read",
	},
	{
		_meta: {
			[POLYCHAT_APP_META_KEY]: {
				category: "Play",
				description: "Act out a card on camera for six seconds and an AI audience guesses it.",
				icon: "drama",
				name: "Charades",
				produces: "A round of guesses. Nothing is saved.",
				surface: "workspace",
				theme: "rose",
				uses: "Your camera. A decision model on your Polychat plan watches a six second clip and guesses.",
				when: "You want a party game on one screen.",
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
				category: "Play",
				description: "Name your piles, tip out up to 80 photos and an AI files each one.",
				icon: "images",
				name: "Photo Sorter",
				produces:
					"Your photos filed into piles, with faces, text, blur and screenshots flagged. Nothing is kept.",
				surface: "workspace",
				theme: "amber",
				uses: "Up to 80 photos you pick. A decision model on your Polychat plan looks at each one.",
				when: "You have a pile of photos to file into groups you name.",
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
				category: "Play",
				description: "An AI thinks of something. Twenty yes or no questions to find it.",
				icon: "message-circle-question",
				name: "Twenty Questions",
				produces: "One game of up to twenty questions. Nothing is saved.",
				surface: "workspace",
				theme: "violet",
				uses: "A secret sealed on Pashi. A decision model on your Polychat plan answers each question.",
				when: "You want a guessing game against the machine.",
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
	{
		_meta: {
			[POLYCHAT_APP_META_KEY]: {
				category: "Creative",
				description:
					"Create and generate music patterns with AI using Strudel's code-based live coding.",
				icon: "music",
				name: "Strudel",
				produces: "Strudel patterns you can play, edit and keep in your pattern library on Pashi.",
				surface: "workspace",
				theme: "pink",
				uses: "The Strudel runtime in your browser, and a text model on your Polychat plan to write patterns.",
				when: "You want to make music by describing it or live-coding it.",
			},
			ui: { resourceUri: MCP_VIEW_URIS.strudel },
		},
		annotations: { readOnlyHint: true },
		description:
			"Open Strudel Music Patterns: generate a Strudel pattern from a description, live-code it in the browser and keep a library of patterns. Opens a studio view.",
		inputSchema: { additionalProperties: false, properties: {}, type: "object" },
		name: "pashi_open_strudel",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Write a Strudel music pattern from a description. Returns the code; nothing is saved. Called by the Strudel view.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				complexity: { enum: [...STRUDEL_COMPLEXITIES], type: "string" },
				prompt: {
					description: "What the music should sound like.",
					maxLength: STRUDEL_LIMITS.promptLength,
					type: "string",
				},
				style: { enum: [...STRUDEL_STYLES], type: "string" },
				tempo: {
					maximum: STRUDEL_LIMITS.tempo.max,
					minimum: STRUDEL_LIMITS.tempo.min,
					type: "integer",
				},
			},
			required: ["prompt"],
			type: "object",
		},
		name: "pashi_generate_strudel",
		ratePolicy: "expensive",
	},
	{
		annotations: { readOnlyHint: true },
		description: "List the Strudel patterns in your library on Pashi, newest first.",
		inputSchema: { additionalProperties: false, properties: {}, type: "object" },
		name: "pashi_list_strudel_patterns",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: false },
		description:
			"Save a Strudel pattern to your library on Pashi. Pass an id to update an existing pattern.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				code: { maxLength: STRUDEL_PATTERN_LIMITS.codeLength, type: "string" },
				description: { maxLength: STRUDEL_PATTERN_LIMITS.descriptionLength, type: "string" },
				id: { description: "The pattern to update. Leave out to create one.", type: "string" },
				name: { maxLength: STRUDEL_PATTERN_LIMITS.nameLength, type: "string" },
				tags: {
					items: { maxLength: STRUDEL_PATTERN_LIMITS.tagLength, type: "string" },
					maxItems: STRUDEL_PATTERN_LIMITS.maxTags,
					type: "array",
				},
			},
			required: ["code"],
			type: "object",
		},
		name: "pashi_save_strudel_pattern",
		ratePolicy: "write",
	},
	{
		annotations: { destructiveHint: true, readOnlyHint: false },
		description: "Delete one Strudel pattern from your library on Pashi.",
		inputSchema: {
			additionalProperties: false,
			properties: { id: { type: "string" } },
			required: ["id"],
			type: "object",
		},
		name: "pashi_delete_strudel_pattern",
		ratePolicy: "write",
	},
	{
		_meta: {
			[POLYCHAT_APP_META_KEY]: {
				category: "Tools",
				description:
					"Live transcription that listens twice: every word is checked against the audio and anything it cannot hear is struck out.",
				icon: "audio-lines",
				name: "Verbatim",
				produces: "A transcript you can copy. Nothing is saved.",
				surface: "workspace",
				theme: "cyan",
				uses: "Your microphone. Workers AI transcribes each phrase and a decision model on your Polychat plan re-listens to every word.",
				when: "You want an exact, word-for-word transcript of what you say.",
			},
			ui: { resourceUri: MCP_VIEW_URIS.verbatim },
		},
		annotations: { readOnlyHint: true },
		description:
			"Open Verbatim: live transcription where every phrase is transcribed, then checked word by word against the audio, and anything the checker cannot hear is struck out. Opens a recording view.",
		inputSchema: { additionalProperties: false, properties: {}, type: "object" },
		name: "pashi_open_verbatim",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Transcribe one spoken phrase with Workers AI. Called by the Verbatim view with a short WAV clip; nothing is stored.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				audio: {
					description: `A base64 audio/wav data URL of at most ${VERBATIM_LIMITS.segmentMaxBytes / 1024 / 1024} MiB.`,
					type: "string",
				},
			},
			required: ["audio"],
			type: "object",
		},
		name: "pashi_transcribe_verbatim",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Check a transcribed phrase word by word against its audio and strike out words that are not spoken. Called by the Verbatim view; nothing is stored.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				audio: { description: "The same audio/wav data URL that was transcribed.", type: "string" },
				context: {
					description: "The end of the transcript so far.",
					maxLength: VERBATIM_LIMITS.contextLength,
					type: "string",
				},
				transcribeMs: { minimum: 0, type: "number" },
				transcript: { maxLength: VERBATIM_LIMITS.transcriptLength, type: "string" },
			},
			required: ["audio", "transcript"],
			type: "object",
		},
		name: "pashi_check_verbatim",
		ratePolicy: "read",
	},
	{
		_meta: {
			[POLYCHAT_APP_META_KEY]: {
				category: "Play",
				description:
					"Run a town of up to 50,000 people, pass laws in plain English, throw disasters at it and watch how everyone reacts.",
				icon: "landmark",
				name: "Polis",
				produces: "A simulated town you can save, replay and share from Pashi.",
				surface: "workspace",
				theme: "emerald",
				uses: "A town simulation in your browser. A decision model on your Polychat plan decides how residents react and drafts your laws.",
				when: "You want to see who cheers when you change the rules.",
			},
			ui: { resourceUri: MCP_VIEW_URIS.polis },
		},
		annotations: { readOnlyHint: true },
		description:
			"Open Polis: found a town of up to 50,000 residents, pass laws in plain English, stage disasters, poll the town and watch everyone react. Opens a simulation view.",
		inputSchema: { additionalProperties: false, properties: {}, type: "object" },
		name: "pashi_open_polis",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Ask how groups of Polis residents feel and what they would do under the current laws, and optionally whether they would vote for a proposal. Called by the Polis view.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				buckets: { maxItems: POLIS_MAX_BUCKETS_PER_REQUEST, minItems: 1, type: "array" },
				laws: { items: { type: "string" }, type: "array" },
				proposal: { type: "string" },
			},
			required: ["buckets", "laws"],
			type: "object",
		},
		name: "pashi_polis_decide",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Draft a plain-English proposal into a law the Polis town can enforce. Nothing is enacted. Called by the Polis view.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				parameters: { description: "The town's current parameters.", type: "object" },
				text: {
					maxLength: POLIS_DRAFT_LENGTH.max,
					minLength: POLIS_DRAFT_LENGTH.min,
					type: "string",
				},
			},
			required: ["text"],
			type: "object",
		},
		name: "pashi_polis_draft_law",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: true },
		description:
			"Turn a described event into a scenario the Polis town can stage. Nothing happens until the player lets it. Called by the Polis view.",
		inputSchema: {
			additionalProperties: false,
			properties: {
				text: {
					maxLength: POLIS_DRAFT_LENGTH.max,
					minLength: POLIS_DRAFT_LENGTH.min,
					type: "string",
				},
			},
			required: ["text"],
			type: "object",
		},
		name: "pashi_polis_draft_scenario",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: true },
		description: "List the Polis towns you have saved on Pashi, newest first.",
		inputSchema: { additionalProperties: false, properties: {}, type: "object" },
		name: "pashi_list_polis_towns",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: true },
		description: "Load one saved Polis town recording from Pashi.",
		inputSchema: {
			additionalProperties: false,
			properties: { id: { type: "string" } },
			required: ["id"],
			type: "object",
		},
		name: "pashi_get_polis_town",
		ratePolicy: "read",
	},
	{
		annotations: { readOnlyHint: false },
		description: "Save a Polis town recording to your towns on Pashi.",
		inputSchema: {
			additionalProperties: false,
			properties: { recording: { type: "object" } },
			required: ["recording"],
			type: "object",
		},
		name: "pashi_save_polis_town",
		ratePolicy: "write",
	},
	{
		annotations: { destructiveHint: true, readOnlyHint: false },
		description: "Delete a saved Polis town from Pashi, and its public link if it has one.",
		inputSchema: {
			additionalProperties: false,
			properties: { id: { type: "string" } },
			required: ["id"],
			type: "object",
		},
		name: "pashi_delete_polis_town",
		ratePolicy: "write",
	},
	{
		annotations: { readOnlyHint: false },
		description:
			"Publish a Polis town recording at a public link on pashi.app so anyone can watch it back.",
		inputSchema: {
			additionalProperties: false,
			properties: { recording: { type: "object" } },
			required: ["recording"],
			type: "object",
		},
		name: "pashi_share_polis_town",
		ratePolicy: "write",
	},
	{
		annotations: { destructiveHint: true, readOnlyHint: false },
		description: "Take down the public link for a shared Polis town.",
		inputSchema: {
			additionalProperties: false,
			properties: { id: { type: "string" } },
			required: ["id"],
			type: "object",
		},
		name: "pashi_stop_sharing_polis_town",
		ratePolicy: "write",
	},
];

interface McpOwnerCaller {
	ai?: AiClient;
	origin: string;
	owner: string;
}

interface McpAnonymousCaller {
	ai?: undefined;
	origin: string;
	owner?: undefined;
}

export type McpCaller = McpAnonymousCaller | McpOwnerCaller;

export function listMcpTools(caller: McpCaller) {
	return MCP_TOOLS.filter((tool) => caller.owner !== undefined || tool.anonymous).map(
		({ _meta, annotations, description, inputSchema, name, outputSchema }) => ({
			_meta,
			annotations,
			description,
			inputSchema,
			name,
			outputSchema,
		}),
	);
}

export function canReadMcpResource(uri: string, caller: McpCaller) {
	return (
		caller.owner !== undefined ||
		MCP_TOOLS.some((tool) => tool.anonymous && tool._meta?.ui.resourceUri === uri)
	);
}

export function mcpToolRatePolicy(
	name: string,
	argumentsValue: Record<string, unknown>,
): PolicyName {
	const ratePolicy = MCP_TOOLS.find((tool) => tool.name === name)?.ratePolicy ?? "expensive";

	return typeof ratePolicy === "function" ? ratePolicy(argumentsValue) : ratePolicy;
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

function accountRequired() {
	return new McpToolError(
		"This tool needs an account. Link Polychat, or send a Pashi API key as Authorization: Bearer or X-API-Key.",
		"unauthorised",
	);
}

async function callJsonTool(
	name: string,
	argumentsValue: Record<string, unknown>,
	env: ConversionEnv,
	{ ai, owner }: McpOwnerCaller,
): Promise<unknown> {
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

	if (name === "pashi_open_strudel") {
		return setUpStrudel();
	}

	if (name === "pashi_generate_strudel") {
		return generateStrudelPattern(argumentsValue, env, ai);
	}

	if (name === "pashi_list_strudel_patterns") {
		return listStrudelPatterns(env, owner);
	}

	if (name === "pashi_save_strudel_pattern") {
		return saveStrudelPattern(argumentsValue, env, owner);
	}

	if (name === "pashi_delete_strudel_pattern") {
		return deleteStrudelPattern(argumentsValue, env, owner);
	}

	if (name === "pashi_open_verbatim") {
		return setUpVerbatim();
	}

	if (name === "pashi_transcribe_verbatim") {
		return transcribeVerbatimSegment(argumentsValue, env);
	}

	if (name === "pashi_check_verbatim") {
		return checkVerbatimSegment(argumentsValue, env, ai);
	}

	if (name === "pashi_open_polis") {
		return setUpPolis();
	}

	if (name === "pashi_polis_decide") {
		return decidePolisBuckets(argumentsValue, env, ai);
	}

	if (name === "pashi_polis_draft_law") {
		return draftPolisLaw(argumentsValue, env, ai);
	}

	if (name === "pashi_polis_draft_scenario") {
		return draftPolisScenario(argumentsValue, env, ai);
	}

	if (name === "pashi_list_polis_towns") {
		return listPolisTowns(env, owner);
	}

	if (name === "pashi_get_polis_town") {
		return getPolisTown(argumentsValue, env, owner);
	}

	if (name === "pashi_save_polis_town") {
		return savePolisTown(argumentsValue, env, owner);
	}

	if (name === "pashi_delete_polis_town") {
		return deletePolisTown(argumentsValue, env, owner);
	}

	if (name === "pashi_share_polis_town") {
		return sharePolisTown(argumentsValue, env, owner);
	}

	if (name === "pashi_stop_sharing_polis_town") {
		return stopSharingPolisTown(argumentsValue, env, owner);
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

	throw new Error(`Unknown tool: ${name}`);
}

export async function callMcpTool(
	name: string,
	argumentsValue: Record<string, unknown>,
	env: ConversionEnv,
	caller: McpCaller,
): Promise<McpToolResult> {
	if (caller.owner === undefined && !MCP_TOOLS.find((tool) => tool.name === name)?.anonymous) {
		throw accountRequired();
	}

	if (name === "pashi_generate") {
		return runGenerator(argumentsValue, env, caller.ai);
	}

	if (name === "pashi_convert") {
		return runConverter(argumentsValue, env);
	}

	if (name === "pashi_list_tools") {
		return jsonToolResult(listTools(argumentsValue));
	}

	if (name === "pashi_describe_tool") {
		return jsonToolResult(describeTool(requireToolId(argumentsValue)));
	}

	if (caller.owner === undefined) {
		throw accountRequired();
	}

	return jsonToolResult(await callJsonTool(name, argumentsValue, env, caller));
}
