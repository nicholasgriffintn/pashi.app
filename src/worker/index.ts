import { Hono } from "hono";
import qr from "./routes/qr";

const app = new Hono<{ Bindings: Env }>({ strict: false });

function createApiIndexResponse() {
	return {
		endpoints: ["/api/qr?data=https%3A%2F%2Fpashi.app"],
		name: "Pashi",
	};
}

app.get("/api/info", (c) => c.json(createApiIndexResponse()));

app.route("/api/qr", qr);

export default app;
