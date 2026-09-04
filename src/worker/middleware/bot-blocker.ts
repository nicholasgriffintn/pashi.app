import type { MiddlewareHandler } from "hono";
import { isbot } from "isbot";

import { authenticateApplication, type ApiKeyEnv } from "../services/access/api-keys.ts";
import type { ApiKeyVariables } from "./api-key-access.ts";

export const blockBots: MiddlewareHandler<{
	Bindings: ApiKeyEnv;
	Variables: ApiKeyVariables;
}> = async (c, next) => {
	const userAgent = c.req.header("user-agent") ?? "";

	if (userAgent && isbot(userAgent)) {
		const authentication = await authenticateApplication(c.req.raw, c.env);

		if (authentication.status !== "authenticated") {
			return c.text("Forbidden", 403, {
				"Cache-Control": "no-store",
				"X-Robots-Tag": "noindex, nofollow",
			});
		}

		c.set("application", authentication.application);
	}

	await next();

	if (c.get("application")) {
		c.res.headers.set("Cache-Control", "private, no-store");
	}
};
