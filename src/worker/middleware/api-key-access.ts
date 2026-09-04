import type { Context } from "hono";

import {
	authenticateApplication,
	type ApiKeyEnv,
	type Application,
} from "../services/access/api-keys.ts";

export interface ApiKeyVariables {
	application?: Application;
}

type ApiKeyContext = {
	Bindings: ApiKeyEnv;
	Variables: ApiKeyVariables;
};

export async function requireApiKey<E extends ApiKeyContext>(c: Context<E>) {
	if (c.get("application")) {
		return undefined;
	}

	const authentication = await authenticateApplication(c.req.raw, c.env);

	if (authentication.status === "authenticated") {
		c.set("application", authentication.application);

		return undefined;
	}

	if (authentication.status === "unavailable") {
		return c.json({ error: "API key authentication is unavailable." }, 503, {
			"Cache-Control": "no-store",
		});
	}

	return c.json({ error: "A valid API key is required for this operation." }, 401, {
		"Cache-Control": "no-store",
		"WWW-Authenticate": 'Bearer realm="Pashi API"',
	});
}
