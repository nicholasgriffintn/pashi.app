import { Hono } from "hono";

import { readSharedPolisTown } from "./mcp/polis-towns";
import { createMcpResponse } from "./mcp/protocol";
import { readMcpCallPolicies } from "./mcp/rate-policy";
import { renderSharedPolisPage } from "./mcp/resources";
import { apiCors } from "./middleware/cors";
import { aiClientFor, requirePolychat, resolveAgentAccess } from "./middleware/polychat-access";
import { serveAppView } from "./routes/app-views";
import { guard, type AppContext } from "./routes/context";
import { createLabsRoutes } from "./routes/labs";
import { createPolychatRoutes } from "./routes/polychat";
import { createToolRoutes } from "./routes/tools";
import { isExpensiveGeneratorId } from "./security/policies";
import { assertUniqueToolIdentifiers } from "./services/catalogue-integrity";
import { assertValidToolExamples } from "./services/example-integrity";
import {
	ConversionContainer,
	processConversionQueue,
} from "./services/converters/conversion-pipeline";
import { recordEvent } from "./services/events";
import { createExportResponse } from "./services/export";
import { findGenerator } from "./services/generators/index";
import {
	createGeneratorRequest,
	createGeneratorRequestFromSearchParams,
	usesAiMode,
} from "./services/generators/request";
import { createOgImageResponse } from "./services/og-image";
import { createOpenApiDocument } from "./services/openapi";
import { createSitemapResponse } from "./services/sitemap";
import { readGeneratorBody } from "./utils/body";
import { withCacheControl } from "./utils/cache";
import { toErrorResponse } from "./utils/error-response";
import { errorJson } from "./utils/http";

assertUniqueToolIdentifiers();
assertValidToolExamples();

const app = new Hono<AppContext>({ strict: false });

app.use("*", apiCors);

app.onError((error) => toErrorResponse(error, "Something went wrong handling that request."));

app.get("/api/openapi.json", (c) =>
	withCacheControl(
		Response.json(createOpenApiDocument(new URL(c.req.url).origin, c.env)),
		"catalogue",
	),
);

app.get("/og", (c) => createOgImageResponse(new URL(c.req.url).searchParams.get("path") ?? "/"));

app.route("/api/labs", createLabsRoutes());
app.route("/api/polychat", createPolychatRoutes());

app.all("/mcp", async (c) => {
	const denied = await resolveAgentAccess(c);

	if (denied) {
		return denied;
	}

	const owner = c.get("polychat")?.subjectId ?? c.get("application")?.id;
	const outcomes = await Promise.all(
		(await readMcpCallPolicies(c.req.raw, !owner)).map((policy) => guard(c, { policy })),
	);
	const limited = outcomes.find((outcome) => outcome !== undefined);

	if (limited) {
		return limited;
	}

	const origin = new URL(c.req.url).origin;
	const response = await createMcpResponse(
		c.req.raw,
		c.env,
		owner ? { ai: aiClientFor(c), origin, owner } : { origin },
	);

	recordEvent(c.env, { name: "mcp_call", outcome: response.ok ? "ok" : "error" });

	return response;
});

app.get("/api/polis/shared/:token", async (c) => {
	const limited = await guard(c, { policy: "read" });

	if (limited) {
		return limited;
	}

	const recording = await readSharedPolisTown(c.env, c.req.param("token"));

	return recording
		? Response.json(recording, { headers: { "Cache-Control": "no-store" } })
		: errorJson("This town is not shared any more", 404, "not_found");
});

app.get("/polis/:token", (c) =>
	c.html(renderSharedPolisPage(c.req.param("token"), new URL(c.req.url).origin), 200, {
		"Cache-Control": "no-store",
	}),
);

app.get("/view/:name", serveAppView);

app.get("/sitemap.xml", (c) => createSitemapResponse(new URL(c.req.url).origin));

app.on(["GET", "POST"], "/export/:type/:format", async (c) => {
	const generator = findGenerator(c.req.param("type"));
	const request =
		c.req.method === "GET"
			? createGeneratorRequestFromSearchParams(new URL(c.req.url).searchParams)
			: await readGeneratorBody(c).then((body) => createGeneratorRequest(body.input, body.fields));
	const isAiMode = Boolean(generator?.modes?.includes("ai")) && usesAiMode(request);

	if (isAiMode) {
		const denied = await requirePolychat(c);

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

	const response = await createExportResponse(
		c.req.param("type"),
		c.req.param("format"),
		request,
		c.env,
		aiClientFor(c),
	);

	recordEvent(c.env, {
		kind: c.req.param("format"),
		name: "export_run",
		outcome: response.ok ? "ok" : "error",
		toolId: c.req.param("type"),
	});

	return response;
});

app.route("/api", createToolRoutes());

export { ConversionContainer };

export default {
	fetch: app.fetch,
	queue: processConversionQueue,
};
