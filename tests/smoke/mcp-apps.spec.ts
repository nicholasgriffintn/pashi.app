import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

function readDevKey() {
	const env = readFileSync(resolve(import.meta.dirname, "../../.env.local"), "utf8");
	const key = /^VITE_PASHI_DEV_API_KEY=(.+)$/m.exec(env)?.[1]?.trim();

	if (!key) {
		throw new Error("Run pnpm seed:dev so the smoke test has a local API key.");
	}

	return key;
}

async function rpc(request: APIRequestContext, id: number, method: string, params = {}) {
	const response = await request.post("/mcp", {
		data: { id, jsonrpc: "2.0", method, params },
		headers: { Authorization: `Bearer ${readDevKey()}` },
	});

	expect(response.ok()).toBe(true);

	return response.json();
}

test("the MCP endpoint lists app views and serves one", async ({ request }) => {
	const initialised = await rpc(request, 1, "initialize", { protocolVersion: "2025-06-18" });

	expect(initialised.result.capabilities.resources).toBeDefined();

	const listed = await rpc(request, 2, "resources/list");
	const charades = listed.result.resources.find(
		(resource: { uri: string }) => resource.uri === "ui://pashi/charades",
	);

	expect(charades).toMatchObject({
		_meta: { "app.polychat/standalone": true },
		mimeType: "text/html;profile=mcp-app",
	});

	const read = await rpc(request, 3, "resources/read", { uri: "ui://pashi/charades" });
	const [content] = read.result.contents;

	expect(content.mimeType).toBe("text/html;profile=mcp-app");
	expect(content._meta.ui.csp).toBeDefined();
	expect(content.text).toContain("<!doctype html>");
	expect(content.text).toContain("--magenta");
});
