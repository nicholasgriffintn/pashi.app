import { Hono } from "hono";

import { blockBots } from "./middleware/bot-blocker";
import { createApiIndexResponse } from "./services/api-info";
import { createConverterResponse, findConverterTool } from "./services/converters";
import {
	ConversionContainer,
	createQueuedConversionUploadResponse,
	processConversionQueue,
	type ConversionEnv,
} from "./services/converters/conversion-pipeline";
import { isQueuedConversionUploadRequest } from "./services/converters/conversion-routing";
import { createExportResponse } from "./services/export";
import { createGeneratorResponse, findGenerator } from "./services/generators/index";
import {
	createGeneratorRequest,
	createGeneratorRequestFromSearchParams,
} from "./services/generators/request";
import { createSitemapResponse } from "./services/sitemap";
import { readConverterBody, readGeneratorBody } from "./utils/body";

const app = new Hono<{ Bindings: ConversionEnv }>({ strict: false });

app.use("*", blockBots);

app.get("/api/info", (c) => c.json(createApiIndexResponse(c.env)));

app.get("/sitemap.xml", (c) => {
	const origin = new URL(c.req.url).origin;
	return createSitemapResponse(origin);
});

app.get("/export/:type/:format", (c) =>
	createExportResponse(
		c.req.param("type"),
		c.req.param("format"),
		createGeneratorRequestFromSearchParams(new URL(c.req.url).searchParams),
		c.env,
	),
);

app.post("/export/:type/:format", async (c) => {
	const body = await readGeneratorBody(c);
	return createExportResponse(
		c.req.param("type"),
		c.req.param("format"),
		createGeneratorRequest(body.input, body.fields),
		c.env,
	);
});

app.get("/api/:type", (c) => {
	const type = c.req.param("type");
	const params = new URL(c.req.url).searchParams;

	const generatorTool = findGenerator(type);
	if (generatorTool) {
		return createGeneratorResponse(
			type,
			createGeneratorRequestFromSearchParams(params),
			params,
			c.env,
		);
	}

	const converterTool = findConverterTool(type);
	if (converterTool) {
		return createConverterResponse(type, createGeneratorRequestFromSearchParams(params), c.env, params);
	}

	return c.json({ error: "Unknown tool type." }, 404);
});

app.post("/api/:type", async (c) => {
	const type = c.req.param("type");

	if (findGenerator(type)) {
		const body = await readGeneratorBody(c);
		return createGeneratorResponse(
			type,
			createGeneratorRequest(body.input, body.fields),
			new URLSearchParams(),
			c.env,
		);
	}

	const converterTool = findConverterTool(type);
	if (converterTool) {
		const contentType = c.req.header("content-type")?.toLowerCase() ?? "";
		if (isQueuedConversionUploadRequest(converterTool.id, contentType)) {
			return createQueuedConversionUploadResponse(converterTool.id, c.req.raw, c.env, type);
		}

		const body = await readConverterBody(c);
		return createConverterResponse(type, createGeneratorRequest(body.input, body.fields), c.env);
	}

	return c.json({ error: "Unknown tool type." }, 404);
});

export { ConversionContainer };

export default {
	fetch: app.fetch,
	queue: processConversionQueue,
};
