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
import { renderViewDocument, type ViewTemplate } from "./view-document";
import charadesBody from "./views/charades.html?raw";
import charadesScript from "./views/charades.js?raw";
import consoleBody from "./views/console.html?raw";
import consoleScript from "./views/console.js?raw";

import charadesCss from "./views/charades.css?raw";
import consoleCss from "./views/console.css?raw";

interface McpView {
	data: unknown;
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
];

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

export function readMcpResource(uri: string) {
	const view = VIEWS.find((entry) => entry.uri === uri);

	if (!view) {
		return undefined;
	}

	return {
		contents: [
			{
				_meta: { ui: view.ui },
				mimeType: MCP_APP_MIME_TYPE,
				text: renderViewDocument(view.template, view.data),
				uri: view.uri,
			},
		],
	};
}
