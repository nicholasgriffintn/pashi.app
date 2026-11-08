import {
	MCP_APP_MIME_TYPE,
	MCP_APP_STANDALONE_META_KEY,
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
import {
	TWENTY_QUESTIONS_MAX_QUESTIONS,
	TWENTY_QUESTIONS_QUESTION_LENGTH,
	TWENTY_QUESTIONS_WARMTH_LEVELS,
} from "./twenty-questions";
import { TWENTY_QUESTIONS_CATEGORIES } from "./twenty-questions-secrets";
import { renderViewDocument, type ViewTemplate } from "./view-document";
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
	description: string;
	name: string;
	standalone: boolean;
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
		standalone: false,
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
		standalone: false,
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
		standalone: true,
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
		standalone: true,
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
			categories: TWENTY_QUESTIONS_CATEGORIES.map(({ hint, id, label }) => ({ hint, id, label })),
			maxQuestions: TWENTY_QUESTIONS_MAX_QUESTIONS,
			questionLength: TWENTY_QUESTIONS_QUESTION_LENGTH,
			warmthSteps: TWENTY_QUESTIONS_WARMTH_LEVELS.map((level) => level.split(":")[0]),
		},
		description:
			"Something is sealed on the server. Ask yes or no questions and every answer comes back as a probability.",
		name: "twenty-questions",
		standalone: true,
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
];

function viewMeta(view: McpView) {
	return view.standalone ? { [MCP_APP_STANDALONE_META_KEY]: true, ui: view.ui } : { ui: view.ui };
}

export function listMcpResources() {
	return VIEWS.map((view) => ({
		_meta: viewMeta(view),
		description: view.description,
		mimeType: MCP_APP_MIME_TYPE,
		name: view.name,
		title: view.title,
		uri: view.uri,
	}));
}

export function readMcpResource(uri: string) {
	const view = VIEWS.find((entry) => entry.uri === uri);

	if (!view) {
		return undefined;
	}

	return {
		contents: [
			{
				_meta: viewMeta(view),
				mimeType: MCP_APP_MIME_TYPE,
				text: renderViewDocument(view.template, view.data),
				uri: view.uri,
			},
		],
	};
}
