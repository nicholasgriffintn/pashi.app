import type { Context } from "hono";

import { siteOriginOfAppView } from "../../shared/mcp-apps";
import { renderMcpViewPage } from "../mcp/resources";
import { errorJson } from "../utils/http";
import { guard, type AppContext } from "./context";

export async function serveAppView(c: Context<AppContext>) {
	const limited = await guard(c, { policy: "read" });

	if (limited) {
		return limited;
	}

	const siteOrigin = siteOriginOfAppView(c.req.url);
	const document = siteOrigin
		? renderMcpViewPage(c.req.param("name") ?? "", siteOrigin)
		: undefined;

	if (!siteOrigin || !document) {
		return errorJson("There is no app view here", 404, "not_found");
	}

	return c.html(document, 200, {
		"Cache-Control": "no-store",
		"Content-Security-Policy": `frame-ancestors ${siteOrigin}`,
		"X-Content-Type-Options": "nosniff",
	});
}
