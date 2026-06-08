import { Hono } from "hono";

import { createExportResponse, listExportFormats } from "./services/export";
import { createGeneratorResponse, listGeneratorTools } from "./services/generators/index";
import {
	createGeneratorRequest,
	createGeneratorRequestFromSearchParams,
} from "./services/generators/request";
import { createSitemapResponse } from "./services/sitemap";
import { readGeneratorBody } from "./utils/body";

const app = new Hono<{ Bindings: Env }>({ strict: false });

function createApiIndexResponse() {
	const tools = listGeneratorTools();
	return {
		endpoints: tools.map((tool) => tool.endpoint),
		exportFormats: listExportFormats(),
		name: "Pashi",
		tools,
	};
}

app.get("/api/info", (c) => c.json(createApiIndexResponse()));

app.get("/sitemap.xml", (c) => {
	const origin = new URL(c.req.url).origin;
	return createSitemapResponse(origin);
});

app.get("/export/:type/:format", (c) =>
	createExportResponse(
		c.req.param("type"),
		c.req.param("format"),
		createGeneratorRequestFromSearchParams(new URL(c.req.url).searchParams),
	),
);

app.post("/export/:type/:format", async (c) => {
	const body = await readGeneratorBody(c);
	return createExportResponse(
		c.req.param("type"),
		c.req.param("format"),
		createGeneratorRequest(body.input, body.fields),
	);
});

app.get("/api/:type", (c) =>
	createGeneratorResponse(
		c.req.param("type"),
		createGeneratorRequestFromSearchParams(new URL(c.req.url).searchParams),
		new URL(c.req.url).searchParams,
	),
);

app.post("/api/:type", async (c) => {
	const body = await readGeneratorBody(c);
	return createGeneratorResponse(
		c.req.param("type"),
		createGeneratorRequest(body.input, body.fields),
	);
});

export default app;
