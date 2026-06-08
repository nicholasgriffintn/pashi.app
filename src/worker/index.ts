import { Hono } from "hono";

import { createGeneratorResponse, listGeneratorTools } from "./services/generators/index";
import { createGeneratorRequest } from "./services/generators/request";
import { readGeneratorBody } from "./utils/body";

const app = new Hono<{ Bindings: Env }>({ strict: false });

function createApiIndexResponse() {
	const tools = listGeneratorTools();
	return {
		endpoints: tools.map((tool) => tool.endpoint),
		name: "Pashi",
		tools,
	};
}

app.get("/api/info", (c) => c.json(createApiIndexResponse()));
app.get("/api/:type", (c) =>
	createGeneratorResponse(
		c.req.param("type"),
		createGeneratorRequest(c.req.query("input") ?? c.req.query("data") ?? ""),
		new URL(c.req.url).searchParams,
	),
);
app.post("/api/:type", async (c) => {
	const body = await readGeneratorBody(c);
	return createGeneratorResponse(
		c.req.param("type"),
		createGeneratorRequest(body.input, body.fields),
	);
});

export default app;
