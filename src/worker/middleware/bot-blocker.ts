import type { MiddlewareHandler } from "hono";
import { isbot } from "isbot";

export const blockBots: MiddlewareHandler = async (c, next) => {
	const userAgent = c.req.header("user-agent") ?? "";

	if (userAgent && isbot(userAgent)) {
		return c.text("Forbidden", 403, {
			"Cache-Control": "no-store",
			"X-Robots-Tag": "noindex, nofollow",
		});
	}

	await next();
};
