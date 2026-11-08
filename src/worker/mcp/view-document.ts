import { escapeXml, serialiseJsonForHtml } from "../utils/text";
import bridgeScript from "./views/bridge.js?raw";

import appCss from "../../react-app/index.css?raw";
import viewCss from "./views/view.css?raw";

const TOKEN_BLOCKS = [
	/^:root \{\n[\s\S]*?\n\}$/m,
	/^:root\[data-theme="light"\] \{\n[\s\S]*?\n\}$/m,
];

export interface ViewTemplate {
	body: string;
	css?: string;
	script: string;
	title: string;
}

function readDesignTokens() {
	return TOKEN_BLOCKS.map((pattern) => {
		const block = pattern.exec(appCss)?.[0];

		if (!block) {
			throw new Error("The design token block in index.css has moved; MCP views cannot be themed.");
		}

		return block;
	}).join("\n");
}

export function renderViewDocument(template: ViewTemplate, data: unknown) {
	return [
		"<!doctype html>",
		'<html lang="en-GB">',
		"<head>",
		'<meta charset="utf-8">',
		'<meta name="viewport" content="width=device-width, initial-scale=1">',
		`<title>${escapeXml(template.title)}</title>`,
		`<style>\n${readDesignTokens()}\n${viewCss}\n${template.css ?? ""}</style>`,
		"</head>",
		"<body>",
		template.body,
		`<script type="application/json" id="pashi-data">${serialiseJsonForHtml(data)}</script>`,
		`<script>\n${bridgeScript}</script>`,
		`<script>\n${template.script}</script>`,
		"</body>",
		"</html>",
	].join("\n");
}
