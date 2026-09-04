import { Hono } from "hono";

import { requireApiKey, type ApiKeyVariables } from "./middleware/api-key-access";
import { blockBots } from "./middleware/bot-blocker";
import type { ApiKeyEnv } from "./services/access/api-keys";
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
	usesAiMode,
} from "./services/generators/request";
import { createSitemapResponse } from "./services/sitemap";
import { readConverterBody, readGeneratorBody } from "./utils/body";

type WorkerEnv = ConversionEnv & ApiKeyEnv;

const app = new Hono<{
	Bindings: WorkerEnv;
	Variables: ApiKeyVariables;
}>({ strict: false });

app.use("*", blockBots);

app.get("/api/info", (c) => c.json(createApiIndexResponse(c.env)));

app.get("/sitemap.xml", (c) => {
	const origin = new URL(c.req.url).origin;

	return createSitemapResponse(origin);
});

app.get("/export/:type/:format", async (c) => {
	const generator = findGenerator(c.req.param("type"));
	const request = createGeneratorRequestFromSearchParams(new URL(c.req.url).searchParams);

	if (generator?.modes?.includes("ai") && usesAiMode(request)) {
		const denied = await requireApiKey(c);

		if (denied) {
			return denied;
		}
	}

	return createExportResponse(c.req.param("type"), c.req.param("format"), request, c.env);
});

app.post("/export/:type/:format", async (c) => {
	const body = await readGeneratorBody(c);
	const generator = findGenerator(c.req.param("type"));
	const request = createGeneratorRequest(body.input, body.fields);

	if (generator?.modes?.includes("ai") && usesAiMode(request)) {
		const denied = await requireApiKey(c);

		if (denied) {
			return denied;
		}
	}

	return createExportResponse(c.req.param("type"), c.req.param("format"), request, c.env);
});

app.get("/api/:type", async (c) => {
	const type = c.req.param("type");
	const params = new URL(c.req.url).searchParams;
	const request = createGeneratorRequestFromSearchParams(params);

	const generatorTool = findGenerator(type);

	if (generatorTool) {
		if (generatorTool.modes?.includes("ai") && usesAiMode(request)) {
			const denied = await requireApiKey(c);

			if (denied) {
				return denied;
			}
		}

		return createGeneratorResponse(type, request, params, c.env);
	}

	const converterTool = findConverterTool(type);

	if (converterTool) {
		if (converterTool.runtime === "container") {
			const denied = await requireApiKey(c);

			if (denied) {
				return denied;
			}

			const application = c.get("application");

			if (!application) {
				return c.json({ error: "API key authentication is unavailable." }, 503);
			}

			return createConverterResponse(type, request, c.env, params, application.id);
		}

		return createConverterResponse(type, request, c.env, params);
	}

	return c.json({ error: "Unknown tool type." }, 404);
});

app.post("/api/:type", async (c) => {
	const type = c.req.param("type");
	const generatorTool = findGenerator(type);

	if (generatorTool) {
		const body = await readGeneratorBody(c);
		const request = createGeneratorRequest(body.input, body.fields);

		if (generatorTool.modes?.includes("ai") && usesAiMode(request)) {
			const denied = await requireApiKey(c);

			if (denied) {
				return denied;
			}
		}

		return createGeneratorResponse(type, request, new URLSearchParams(), c.env);
	}

	const converterTool = findConverterTool(type);

	if (converterTool) {
		if (converterTool.runtime === "container") {
			const denied = await requireApiKey(c);

			if (denied) {
				return denied;
			}

			const application = c.get("application");

			if (!application) {
				return c.json({ error: "API key authentication is unavailable." }, 503);
			}

			const contentType = c.req.header("content-type")?.toLowerCase() ?? "";

			if (isQueuedConversionUploadRequest(converterTool.id, contentType)) {
				return createQueuedConversionUploadResponse(
					converterTool.id,
					c.req.raw,
					c.env,
					application.id,
					type,
				);
			}

			const body = await readConverterBody(c);

			return createConverterResponse(
				type,
				createGeneratorRequest(body.input, body.fields),
				c.env,
				undefined,
				application.id,
			);
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
