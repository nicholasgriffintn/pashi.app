import type { MiddlewareHandler } from "hono";

const ALLOWED_HEADERS = "Content-Type, Authorization, X-API-Key";
const ALLOWED_METHODS = "GET, POST, OPTIONS";

function isPublicApiPath(pathname: string) {
	return pathname.startsWith("/api/") || pathname.startsWith("/export/");
}

export const apiCors: MiddlewareHandler = async (c, next) => {
	const { pathname } = new URL(c.req.url);

	if (!isPublicApiPath(pathname)) {
		await next();

		return;
	}

	if (c.req.method === "OPTIONS") {
		return new Response(null, {
			headers: {
				"Access-Control-Allow-Headers": ALLOWED_HEADERS,
				"Access-Control-Allow-Methods": ALLOWED_METHODS,
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Max-Age": "86400",
			},
			status: 204,
		});
	}

	await next();

	c.res.headers.set("Access-Control-Allow-Origin", "*");
	c.res.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
	c.res.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
	c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	c.res.headers.set("X-Content-Type-Options", "nosniff");
};
