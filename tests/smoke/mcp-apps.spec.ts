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

	const tools = await rpc(request, 2, "tools/list");
	const charadesTool = tools.result.tools.find(
		(tool: { name: string }) => tool.name === "pashi_play_charades",
	);

	expect(charadesTool).toMatchObject({
		_meta: { "app.polychat/app": { name: "Charades" }, ui: { resourceUri: "ui://pashi/charades" } },
		annotations: { readOnlyHint: true },
	});
	expect(charadesTool.inputSchema.required).toBeUndefined();

	const listed = await rpc(request, 4, "resources/list");

	expect(listed.result.resources).toContainEqual(
		expect.objectContaining({ mimeType: "text/html;profile=mcp-app", uri: "ui://pashi/charades" }),
	);

	const read = await rpc(request, 3, "resources/read", { uri: "ui://pashi/charades" });
	const [content] = read.result.contents;

	expect(content.mimeType).toBe("text/html;profile=mcp-app");
	expect(content._meta.ui.csp).toBeDefined();
	expect(content.text).toContain("<!doctype html>");
	expect(content.text).toContain("--magenta");
});

test("every Polychat app tool opens with no input on a view that resolves", async ({ request }) => {
	const listed = await rpc(request, 1, "tools/list");
	const tools: {
		_meta?: { "app.polychat/app"?: Record<string, string>; ui?: { resourceUri: string } };
		annotations: { readOnlyHint: boolean };
		inputSchema: { required?: string[] };
		name: string;
	}[] = listed.result.tools;
	const apps = tools.filter((tool) => tool._meta?.["app.polychat/app"]);

	expect(apps.map((tool) => tool.name)).toEqual(
		expect.arrayContaining([
			"pashi_play_charades",
			"pashi_play_photo_sorter",
			"pashi_play_twenty_questions",
			"pashi_open_strudel",
			"pashi_open_verbatim",
			"pashi_open_polis",
		]),
	);

	for (const app of apps) {
		expect(app.annotations.readOnlyHint, app.name).toBe(true);
		expect(app.inputSchema.required, app.name).toBeUndefined();
		expect(Object.keys(app._meta?.["app.polychat/app"] ?? {}).toSorted(), app.name).toEqual([
			"category",
			"description",
			"icon",
			"name",
			"produces",
			"surface",
			"theme",
			"uses",
			"when",
		]);

		const read = await rpc(request, 2, "resources/read", { uri: app._meta?.ui?.resourceUri });
		const [content] = read.result.contents;

		expect(content.mimeType, app.name).toBe("text/html;profile=mcp-app");
		expect(content.text, app.name).toContain("PashiBridge");
		expect(content.text, app.name).not.toContain("failed to build");
		expect(content.text.length, app.name).toBeLessThan(1024 * 1024);
	}
});

test("tools that change saved state are not marked read-only", async ({ request }) => {
	const listed = await rpc(request, 1, "tools/list");
	const tools: { annotations: { readOnlyHint: boolean }; name: string }[] = listed.result.tools;
	const writes = tools.filter((tool) => /^pashi_(save|delete|share|stop_sharing)_/.test(tool.name));

	expect(writes.length).toBeGreaterThan(0);

	for (const tool of writes) {
		expect(tool.annotations.readOnlyHint, tool.name).toBe(false);
	}
});

test("the resource list includes the new app views", async ({ request }) => {
	const listed = await rpc(request, 1, "resources/list");
	const uris = listed.result.resources.map((resource: { uri: string }) => resource.uri);

	expect(uris).toEqual(
		expect.arrayContaining(["ui://pashi/strudel", "ui://pashi/verbatim", "ui://pashi/polis"]),
	);

	const evaluating = listed.result.resources
		.filter(
			(resource: { _meta: { ui: { csp: { allowEval?: boolean } } } }) =>
				resource._meta.ui.csp.allowEval,
		)
		.map((resource: { uri: string }) => resource.uri);

	expect(evaluating).toEqual(["ui://pashi/strudel"]);
});

test("handshake and discovery traffic from a host is not rate limited", async ({ request }) => {
	await Promise.all(
		Array.from({ length: 15 }, (_, index) =>
			rpc(request, index + 1, index % 2 === 0 ? "initialize" : "tools/list", {
				protocolVersion: "2025-06-18",
			}),
		),
	);
});
