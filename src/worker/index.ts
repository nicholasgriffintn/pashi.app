import { Hono } from "hono";

import { createGeneratorResponse, listGeneratorTools } from "./services/generators/index";
import { readInputBody } from "./utils/body";

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
		c.req.query("input") ?? c.req.query("data") ?? "",
		new URL(c.req.url).searchParams,
	),
);
app.post("/api/:type", async (c) =>
	createGeneratorResponse(c.req.param("type"), await readInputBody(c)),
);

export default app;
