import { Hono, type Context } from "hono";

import type { PolychatSessionStatus } from "../../shared/polychat";
import {
	clearedSessionCookie,
	endConnection,
	finishConnection,
	readSessionStatus,
	startConnection,
} from "../services/polychat/session";
import { guard, type AppContext } from "./context";

const NO_STORE = { "Cache-Control": "no-store" };

function sessionResponse(c: Context<AppContext>, status: PolychatSessionStatus, cookie?: string) {
	return c.json(status, 200, { ...NO_STORE, ...(cookie ? { "Set-Cookie": cookie } : {}) });
}

export function createPolychatRoutes() {
	const routes = new Hono<AppContext>({ strict: false });

	routes.get("/session", async (c) => {
		const limited = await guard(c);

		if (limited) {
			return limited;
		}

		const { clearCookie, status } = await readSessionStatus(c.req.raw, c.env);

		return sessionResponse(c, status, clearCookie ? clearedSessionCookie(c.req.raw) : undefined);
	});

	routes.delete("/session", async (c) => {
		const limited = await guard(c);

		if (limited) {
			return limited;
		}

		await endConnection(c.req.raw, c.env);

		return sessionResponse(c, { status: "disconnected" }, clearedSessionCookie(c.req.raw));
	});

	routes.post("/connect", async (c) => {
		const limited = await guard(c);

		if (limited) {
			return limited;
		}

		const { authorisationUrl, cookie } = await startConnection(c.req.raw, c.env);

		return c.json({ authorisationUrl }, 200, { ...NO_STORE, "Set-Cookie": cookie });
	});

	routes.get("/callback", async (c) => {
		const limited = await guard(c);

		if (limited) {
			return limited;
		}

		const { cookies, outcome } = await finishConnection(c.req.raw, c.env);
		const headers = new Headers({
			...NO_STORE,
			Location: outcome === "connected" ? "/sign-in" : `/sign-in?polychat=${outcome}`,
			"Referrer-Policy": "no-referrer",
		});

		for (const cookie of cookies) {
			headers.append("Set-Cookie", cookie);
		}

		return new Response(null, { headers, status: 302 });
	});

	return routes;
}
