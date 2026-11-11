import { Hono } from "hono";

import { readUsageStats } from "../services/stats";
import { errorJson } from "../utils/http";
import { guard, type AppContext } from "./context";

export function createStatsRoutes() {
	const routes = new Hono<AppContext>({ strict: false });

	routes.get("/", async (c) => {
		const limited = await guard(c, { policy: "read" });

		if (limited) {
			return limited;
		}

		const result = await readUsageStats(c.env);

		if (result.status !== "ok") {
			return errorJson(
				result.status === "not_configured"
					? "Usage stats are not configured on this deployment."
					: "Usage stats are unavailable right now.",
				503,
				"unavailable",
				{ "Cache-Control": "no-store" },
			);
		}

		return c.json(result.stats, 200, { "Cache-Control": "public, max-age=300" });
	});

	return routes;
}
