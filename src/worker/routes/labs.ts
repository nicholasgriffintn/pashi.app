import { Hono } from "hono";

import { runEvaluation } from "../ai/evaluation/runner";
import { requireApiKey } from "../middleware/api-key-access";
import { recordEvent } from "../services/events";
import { createFeatureStatus } from "../services/features";
import { routeRequestToTool } from "../services/labs/ask";
import { explainInput, isExplainSubject } from "../services/labs/explain";
import { readGeneratorBody } from "../utils/body";
import { errorJson } from "../utils/http";
import { guard, type AppContext, type WorkerEnv } from "./context";

function aiUnavailable(env: WorkerEnv) {
	return !createFeatureStatus(env).ai.available;
}

export function createLabsRoutes() {
	const routes = new Hono<AppContext>({ strict: false });

	routes.post("/ask", async (c) => {
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
		const startedAt = Date.now();
		const route = await routeRequestToTool(c.env, body.input || body.fields.request || "");

		recordEvent(c.env, {
			durationMs: Date.now() - startedAt,
			kind: "ask",
			name: "ai_call",
			toolId: route.toolId,
		});

		return c.json(route);
	});

	routes.post("/explain/:subject", async (c) => {
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
		const startedAt = Date.now();
		const explanation = await explainInput(c.env, subject, body.input);

		recordEvent(c.env, {
			durationMs: Date.now() - startedAt,
			kind: subject,
			name: "ai_call",
		});

		return c.json(explanation);
	});

	routes.post("/evaluate", async (c) => {
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

		const report = await runEvaluation(c.env);

		return c.json(report, report.failed === 0 ? 200 : 424);
	});

	return routes;
}
