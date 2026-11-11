import { Hono } from "hono";

import type { AppPreviewsResponse } from "../../shared/app-previews";
import { listAppPreviews } from "../mcp/app-previews";
import { withCacheControl } from "../utils/cache";
import { guard, type AppContext } from "./context";

export function createAppRoutes() {
	const routes = new Hono<AppContext>({ strict: false });

	routes.get("/", async (c) => {
		const limited = await guard(c, { policy: "read" });

		if (limited) {
			return limited;
		}

		const body: AppPreviewsResponse = { apps: listAppPreviews() };

		return withCacheControl(Response.json(body), "catalogue");
	});

	return routes;
}
