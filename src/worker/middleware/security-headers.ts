import type { MiddlewareHandler } from "hono";

const BASELINE_HEADERS = {
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Strict-Transport-Security": "max-age=31536000",
	"X-Content-Type-Options": "nosniff",
} as const;

export const securityHeaders: MiddlewareHandler = async (c, next) => {
	await next();

	const missing = Object.entries(BASELINE_HEADERS).filter(([name]) => !c.res.headers.has(name));

	if (missing.length === 0) {
		return;
	}

	const response = new Response(c.res.body, c.res);

	for (const [name, value] of missing) {
		response.headers.set(name, value);
	}

	c.res = response;
};
