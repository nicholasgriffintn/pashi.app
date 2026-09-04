import { Hono } from "hono";
import type { Context } from "hono";

import { createMcpResponse } from "./mcp/protocol";
import { requireApiKey, type ApiKeyVariables } from "./middleware/api-key-access";
import { apiCors } from "./middleware/cors";
import { enforceRateLimit } from "./security/guard";
import { isExpensiveGeneratorId, policyFor } from "./security/policies";
import type { ApiKeyEnv } from "./services/access/api-keys";
import { createApiIndexResponse } from "./services/api-info";
import { assertUniqueToolIdentifiers } from "./services/catalogue-integrity";
import { createConverterResponse, findConverterTool } from "./services/converters";
import {
	ConversionContainer,
	createQueuedConversionUploadResponse,
	processConversionQueue,
	type ConversionEnv,
} from "./services/converters/conversion-pipeline";
import { isQueuedConversionUploadRequest } from "./services/converters/conversion-routing";
import { createExportResponse } from "./services/export";
import { createFeatureStatus } from "./services/features";
import { createGeneratorResponse, findGenerator } from "./services/generators/index";
import {
	createGeneratorRequest,
	createGeneratorRequestFromSearchParams,
	usesAiMode,
} from "./services/generators/request";
import { createHealthResponse } from "./services/health";
import { routeRequestToTool } from "./services/labs/ask";
import { explainInput, isExplainSubject } from "./services/labs/explain";
import { createSitemapResponse } from "./services/sitemap";
import { readConverterBody, readGeneratorBody } from "./utils/body";
import { withCacheControl } from "./utils/cache";
import { toErrorResponse } from "./utils/error-response";
import { errorJson } from "./utils/http";

assertUniqueToolIdentifiers();

type WorkerEnv = ConversionEnv & ApiKeyEnv;

type AppContext = {
	Bindings: WorkerEnv;
	Variables: ApiKeyVariables;
};

const app = new Hono<AppContext>({ strict: false });

app.use("*", apiCors);

app.onError((error) => toErrorResponse(error, "Something went wrong handling that request."));

async function guard(
	c: Context<AppContext>,
	options: {
		isAiMode?: boolean;
		isContainerRuntime?: boolean;
		isExpensiveGenerator?: boolean;
		isUpload?: boolean;
	} = {},
) {
	return enforceRateLimit({
		applicationId: c.get("application")?.id,
		env: c.env,
		policy: policyFor({
			isAiMode: options.isAiMode ?? false,
			isContainerRuntime: options.isContainerRuntime ?? false,
			isExpensiveGenerator: options.isExpensiveGenerator ?? false,
			isUpload: options.isUpload ?? false,
			method: c.req.method,
		}),
		request: c.req.raw,
	});
}

app.get("/api/info", (c) =>
	withCacheControl(Response.json(createApiIndexResponse(c.env)), "catalogue"),
);

app.get("/api/health", (c) => createHealthResponse(c.env));

function aiUnavailable(env: WorkerEnv) {
	return !createFeatureStatus(env).ai.available;
}

app.post("/api/labs/ask", async (c) => {
	if (aiUnavailable(c.env)) {
		return errorJson("AI is not available.", 503, "unavailable");
	}

	const denied = await requireApiKey(c);

	if (denied) {
		return denied;
	}

	const limited = await guard(c, { isAiMode: true });

	if (limited) {
		return limited;
	}

	const body = await readGeneratorBody(c);

	return c.json(await routeRequestToTool(c.env, body.input || body.fields.request || ""));
});

app.post("/api/labs/explain/:subject", async (c) => {
	if (aiUnavailable(c.env)) {
		return errorJson("AI is not available.", 503, "unavailable");
	}

	const subject = c.req.param("subject");

	if (!isExplainSubject(subject)) {
		return errorJson("Unknown explainer.", 404, "not_found");
	}

	const denied = await requireApiKey(c);

	if (denied) {
		return denied;
	}

	const limited = await guard(c, { isAiMode: true });

	if (limited) {
		return limited;
	}

	const body = await readGeneratorBody(c);

	return c.json(await explainInput(c.env, subject, body.input));
});

app.all("/mcp", async (c) => {
	const denied = await requireApiKey(c);

	if (denied) {
		return denied;
	}

	const limited = await guard(c, { isAiMode: true });

	if (limited) {
		return limited;
	}

	return createMcpResponse(c.req.raw, c.env);
});

app.get("/sitemap.xml", (c) => createSitemapResponse(new URL(c.req.url).origin));

app.on(["GET", "POST"], "/export/:type/:format", async (c) => {
	const generator = findGenerator(c.req.param("type"));
	const request =
		c.req.method === "GET"
			? createGeneratorRequestFromSearchParams(new URL(c.req.url).searchParams)
			: await readGeneratorBody(c).then((body) => createGeneratorRequest(body.input, body.fields));
	const isAiMode = Boolean(generator?.modes?.includes("ai")) && usesAiMode(request);

	if (isAiMode) {
		const denied = await requireApiKey(c);

		if (denied) {
			return denied;
		}
	}

	const limited = await guard(c, {
		isAiMode,
		isExpensiveGenerator: generator ? isExpensiveGeneratorId(generator.id) : false,
	});

	if (limited) {
		return limited;
	}

	return createExportResponse(c.req.param("type"), c.req.param("format"), request, c.env);
});

app.get("/api/:type", async (c) => {
	const type = c.req.param("type");
	const params = new URL(c.req.url).searchParams;
	const request = createGeneratorRequestFromSearchParams(params);
	const generatorTool = findGenerator(type);

	if (generatorTool) {
		const isAiMode = Boolean(generatorTool.modes?.includes("ai")) && usesAiMode(request);

		if (isAiMode) {
			const denied = await requireApiKey(c);

			if (denied) {
				return denied;
			}
		}

		const limited = await guard(c, {
			isAiMode,
			isExpensiveGenerator: isExpensiveGeneratorId(generatorTool.id),
		});

		if (limited) {
			return limited;
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
				return errorJson("API key authentication is unavailable.", 503, "unavailable");
			}

			const limited = await guard(c, { isContainerRuntime: true });

			if (limited) {
				return limited;
			}

			return createConverterResponse(type, request, c.env, params, application.id);
		}

		const limited = await guard(c);

		if (limited) {
			return limited;
		}

		return createConverterResponse(type, request, c.env, params);
	}

	return errorJson("Unknown tool type.", 404, "not_found");
});

app.post("/api/:type", async (c) => {
	const type = c.req.param("type");
	const generatorTool = findGenerator(type);

	if (generatorTool) {
		const body = await readGeneratorBody(c);
		const request = createGeneratorRequest(body.input, body.fields);
		const isAiMode = Boolean(generatorTool.modes?.includes("ai")) && usesAiMode(request);

		if (isAiMode) {
			const denied = await requireApiKey(c);

			if (denied) {
				return denied;
			}
		}

		const limited = await guard(c, {
			isAiMode,
			isExpensiveGenerator: isExpensiveGeneratorId(generatorTool.id),
		});

		if (limited) {
			return limited;
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
				return errorJson("API key authentication is unavailable.", 503, "unavailable");
			}

			const contentType = c.req.header("content-type")?.toLowerCase() ?? "";
			const isUpload = isQueuedConversionUploadRequest(converterTool.id, contentType);
			const limited = await guard(c, { isContainerRuntime: true, isUpload });

			if (limited) {
				return limited;
			}

			if (isUpload) {
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

		const limited = await guard(c);

		if (limited) {
			return limited;
		}

		const body = await readConverterBody(c);

		return createConverterResponse(type, createGeneratorRequest(body.input, body.fields), c.env);
	}

	return errorJson("Unknown tool type.", 404, "not_found");
});

export { ConversionContainer };

export default {
	fetch: app.fetch,
	queue: processConversionQueue,
};
