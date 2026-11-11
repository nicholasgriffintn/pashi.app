import { Hono, type Context } from "hono";

import { runEvaluation } from "../ai/evaluation/runner";
import type { AiClient } from "../ai/run";
import { aiClientFor, requirePolychat } from "../middleware/polychat-access";
import { recordEvent } from "../services/events";
import { createFeatureStatus } from "../services/features";
import { askPashi } from "../services/labs/ask";
import { explainInput, isExplainSubject } from "../services/labs/explain";
import { readGeneratorBody } from "../utils/body";
import { errorJson } from "../utils/http";
import { guard, type AppContext } from "./context";

type AiAccess = { ai: AiClient } | { denied: Response };

async function requireAiAccess(c: Context<AppContext>): Promise<AiAccess> {
	const denied = await requirePolychat(c);

	if (denied) {
		return { denied };
	}

	const limited = await guard(c, { isAiMode: true });
	const ai = aiClientFor(c);

	if (limited || !ai) {
		return { denied: limited ?? errorJson("AI is not available.", 503, "unavailable") };
	}

	return { ai };
}

function aiUnavailable(c: Context<AppContext>) {
	return !createFeatureStatus(c.env).ai.available;
}

export function createLabsRoutes() {
	const routes = new Hono<AppContext>({ strict: false });

	routes.post("/ask", async (c) => {
		if (aiUnavailable(c)) {
			return errorJson("AI is not available.", 503, "unavailable");
		}

		const access = await requireAiAccess(c);

		if ("denied" in access) {
			return access.denied;
		}

		const body = await readGeneratorBody(c);

		return c.json(await askPashi(access.ai, body.input || body.fields.request || "", c.env));
	});

	routes.post("/explain/:subject", async (c) => {
		if (aiUnavailable(c)) {
			return errorJson("AI is not available.", 503, "unavailable");
		}

		const subject = c.req.param("subject");

		if (!isExplainSubject(subject)) {
			return errorJson("Unknown explainer.", 404, "not_found");
		}

		const access = await requireAiAccess(c);

		if ("denied" in access) {
			return access.denied;
		}

		const body = await readGeneratorBody(c);
		const startedAt = Date.now();
		const explanation = await explainInput(access.ai, subject, body.input);

		recordEvent(c.env, {
			durationMs: Date.now() - startedAt,
			kind: subject,
			name: "ai_call",
		});

		return c.json(explanation);
	});

	routes.post("/evaluate", async (c) => {
		if (aiUnavailable(c)) {
			return errorJson("AI is not available.", 503, "unavailable");
		}

		const access = await requireAiAccess(c);

		if ("denied" in access) {
			return access.denied;
		}

		const report = await runEvaluation(access.ai);

		return c.json(report, report.failed === 0 ? 200 : 424);
	});

	return routes;
}
