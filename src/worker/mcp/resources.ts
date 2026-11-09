import polisView from "virtual:mcp-view/polis";
import strudelView from "virtual:mcp-view/strudel";
import verbatimView from "virtual:mcp-view/verbatim";

import { isRecord } from "../../shared/records";
import {
	MCP_APP_MIME_TYPE,
	MCP_VIEW_URIS,
	type McpAppUiMeta,
	type McpViewUri,
	PASHI_SITE_URL,
} from "./apps";
import {
	CHARADES_CLIP_SECONDS,
	CHARADES_COUNTDOWN_SECONDS,
	CHARADES_DECKS,
	CHARADES_RULES,
} from "./charades";
import { CHARADES_CLIP_MAX_BYTES, CHARADES_DRAMA_LEVELS } from "./charades-judge";
import {
	PHOTO_SORTER_FLAGS,
	PHOTO_SORTER_KEEPER_LEVELS,
	PHOTO_SORTER_LIMITS,
	PHOTO_SORTER_PRESETS,
} from "./photo-sorter";
import { POLIS_TOWN_LIMITS } from "./polis-towns";
import { STRUDEL_LIMITS, STRUDEL_RUNTIME, STRUDEL_SAMPLE_HOST, STRUDEL_SAMPLES } from "./strudel";
import { STRUDEL_PATTERN_LIMITS } from "./strudel-patterns";
import { STRUDEL_COMPLEXITIES, STRUDEL_STYLES } from "./strudel-prompts";
import {
	TWENTY_QUESTIONS_MAX_QUESTIONS,
	TWENTY_QUESTIONS_QUESTION_LENGTH,
	TWENTY_QUESTIONS_WARMTH_LEVELS,
} from "./twenty-questions";
import { TWENTY_QUESTIONS_CATEGORIES } from "./twenty-questions-secrets";
import { VERBATIM_LIMITS } from "./verbatim";
import { bundledViewTemplate, renderViewDocument, type ViewTemplate } from "./view-document";
import charadesBody from "./views/charades.html?raw";
import charadesScript from "./views/charades.js?raw";
import consoleBody from "./views/console.html?raw";
import consoleScript from "./views/console.js?raw";
import photoSorterBody from "./views/photo-sorter.html?raw";
import photoSorterScript from "./views/photo-sorter.js?raw";
import twentyQuestionsBody from "./views/twenty-questions.html?raw";
import twentyQuestionsScript from "./views/twenty-questions.js?raw";

import charadesCss from "./views/charades.css?raw";
import consoleCss from "./views/console.css?raw";
import photoSorterCss from "./views/photo-sorter.css?raw";
import twentyQuestionsCss from "./views/twenty-questions.css?raw";

interface McpView {
	data: unknown;
	needsSiteUrl?: boolean;
	description: string;
	name: string;
	template: ViewTemplate;
	title: string;
	ui: McpAppUiMeta;
	uri: McpViewUri;
}

const SELF_CONTAINED: McpAppUiMeta["csp"] = { connectDomains: [], resourceDomains: [] };

const VIEWS: readonly McpView[] = [
	{
		data: { kind: "generator", toolUrl: `${PASHI_SITE_URL}/tools/` },
		description: "Shows a pashi_generate result with its options editable, and runs it again.",
		name: "generator",
		template: {
			body: consoleBody,
			css: consoleCss,
			script: consoleScript,
			title: "Pashi generator",
		},
		title: "Pashi generator",
		ui: { csp: SELF_CONTAINED, permissions: { clipboardWrite: {} }, prefersBorder: false },
		uri: MCP_VIEW_URIS.generator,
	},
	{
		data: { kind: "converter", toolUrl: `${PASHI_SITE_URL}/tools/convert/` },
		description:
			"Shows a pashi_convert result next to its input, with the input and options editable.",
		name: "converter",
		template: {
			body: consoleBody,
			css: consoleCss,
			script: consoleScript,
			title: "Pashi converter",
		},
		title: "Pashi converter",
		ui: { csp: SELF_CONTAINED, permissions: { clipboardWrite: {} }, prefersBorder: false },
		uri: MCP_VIEW_URIS.converter,
	},
	{
		data: {
			clipMaxBytes: CHARADES_CLIP_MAX_BYTES,
			clipSeconds: CHARADES_CLIP_SECONDS,
			countdownSeconds: CHARADES_COUNTDOWN_SECONDS,
			decks: CHARADES_DECKS,
			dramaLevels: CHARADES_DRAMA_LEVELS,
			rules: CHARADES_RULES,
		},
		description:
			"Six seconds, one card, an audience of one decision model. Act it out on camera and see what it guesses.",
		name: "charades",
		template: { body: charadesBody, css: charadesCss, script: charadesScript, title: "Charades" },
		title: "Charades",
		ui: {
			csp: SELF_CONTAINED,
			permissions: { camera: {}, microphone: {} },
			prefersBorder: false,
		},
		uri: MCP_VIEW_URIS.charades,
	},
	{
		data: {
			flags: PHOTO_SORTER_FLAGS,
			keeperLevels: PHOTO_SORTER_KEEPER_LEVELS,
			limits: PHOTO_SORTER_LIMITS,
			presets: PHOTO_SORTER_PRESETS,
		},
		description:
			"Name your piles, tip out up to 80 photos and watch each one get filed, with faces, text, blur and screenshots flagged.",
		name: "photo-sorter",
		template: {
			body: photoSorterBody,
			css: photoSorterCss,
			script: photoSorterScript,
			title: "Photo Sorter",
		},
		title: "Photo Sorter",
		ui: { csp: SELF_CONTAINED, prefersBorder: false },
		uri: MCP_VIEW_URIS.photoSorter,
	},
	{
		data: {
			complexities: STRUDEL_COMPLEXITIES,
			limits: { ...STRUDEL_LIMITS, ...STRUDEL_PATTERN_LIMITS },
			modules: STRUDEL_RUNTIME.modules,
			samples: STRUDEL_SAMPLES,
			styles: STRUDEL_STYLES,
		},
		needsSiteUrl: true,
		description:
			"Generate Strudel music patterns with AI, live-code them in the Strudel editor and keep a pattern library.",
		name: "strudel",
		template: bundledViewTemplate(strudelView, "Strudel Music Patterns"),
		title: "Strudel Music Patterns",
		ui: {
			csp: {
				allowEval: true,
				connectDomains: [STRUDEL_SAMPLE_HOST, STRUDEL_RUNTIME.host],
				resourceDomains: [STRUDEL_RUNTIME.host],
			},
			permissions: { clipboardWrite: {} },
			prefersBorder: false,
		},
		uri: MCP_VIEW_URIS.strudel,
	},
	{
		data: {
			categories: TWENTY_QUESTIONS_CATEGORIES.map(({ hint, id, label }) => ({ hint, id, label })),
			maxQuestions: TWENTY_QUESTIONS_MAX_QUESTIONS,
			questionLength: TWENTY_QUESTIONS_QUESTION_LENGTH,
			warmthSteps: TWENTY_QUESTIONS_WARMTH_LEVELS.map((level) => level.split(":")[0]),
		},
		description:
			"Something is sealed on the server. Ask yes or no questions and every answer comes back as a probability.",
		name: "twenty-questions",
		template: {
			body: twentyQuestionsBody,
			css: twentyQuestionsCss,
			script: twentyQuestionsScript,
			title: "Twenty Questions",
		},
		title: "Twenty Questions",
		ui: { csp: SELF_CONTAINED, prefersBorder: false },
		uri: MCP_VIEW_URIS.twentyQuestions,
	},
	{
		data: { limits: VERBATIM_LIMITS },
		description:
			"Live transcription that listens twice: every phrase is transcribed, then each word is checked against the audio and struck out if it cannot be heard.",
		name: "verbatim",
		template: bundledViewTemplate(verbatimView, "Verbatim"),
		title: "Verbatim",
		ui: {
			csp: SELF_CONTAINED,
			permissions: { clipboardWrite: {}, microphone: {} },
			prefersBorder: false,
		},
		uri: MCP_VIEW_URIS.verbatim,
	},
	{
		data: { limits: POLIS_TOWN_LIMITS, mode: "app" },
		needsSiteUrl: true,
		description:
			"Found a town of up to 50,000 people, pass laws in plain English, throw disasters at it and watch how everyone reacts.",
		name: "polis",
		template: bundledViewTemplate(polisView, "Polis"),
		title: "Polis",
		ui: { csp: SELF_CONTAINED, prefersBorder: false },
		uri: MCP_VIEW_URIS.polis,
	},
];

export function renderSharedPolisPage(token: string, origin: string) {
	return renderViewDocument(bundledViewTemplate(polisView, "Polis"), {
		mode: "shared",
		recordingUrl: `/api/polis/shared/${token}`,
		siteUrl: origin,
	});
}

export function listMcpResources() {
	return VIEWS.map((view) => ({
		_meta: { ui: view.ui },
		description: view.description,
		mimeType: MCP_APP_MIME_TYPE,
		name: view.name,
		title: view.title,
		uri: view.uri,
	}));
}

function viewData(view: McpView, origin: string) {
	return view.needsSiteUrl && isRecord(view.data) ? { ...view.data, siteUrl: origin } : view.data;
}

export function readMcpResource(uri: string, origin: string) {
	const view = VIEWS.find((entry) => entry.uri === uri);

	if (!view) {
		return undefined;
	}

	return {
		contents: [
			{
				_meta: { ui: view.ui },
				mimeType: MCP_APP_MIME_TYPE,
				text: renderViewDocument(view.template, viewData(view, origin)),
				uri: view.uri,
			},
		],
	};
}
