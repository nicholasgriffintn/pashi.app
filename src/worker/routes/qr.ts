import { Hono, type Context } from "hono";

import { createQrPng, createQrSvg } from "../lib/qr";
import { parseQrGenerationRequest } from "../lib/qr-request";

const app = new Hono({ strict: false });

function createQrResponse(c: Context) {
	const parsed = parseQrGenerationRequest(new URL(c.req.url).searchParams);
	if ("status" in parsed) {
		return c.json({ error: parsed.message }, parsed.status);
	}

	const image =
		parsed.format === "svg"
			? createQrSvg(parsed.payload, parsed.size.width, parsed.size.height)
			: createQrPng(parsed.payload, parsed.size.width, parsed.size.height);

	return new Response(image, {
		headers: {
			"Cache-Control": "no-store",
			"Content-Type":
				parsed.format === "svg" ? "image/svg+xml; charset=utf-8" : "image/png",
			"X-Content-Type-Options": "nosniff",
		},
	});
}

app.get("/", createQrResponse);

export default app;
