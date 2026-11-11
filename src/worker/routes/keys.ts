import { Hono, type Context } from "hono";

import { isRecord } from "../../shared/records";
import {
	createSelfServeKey,
	listSelfServeKeys,
	revokeSelfServeKey,
	SELF_SERVE_KEY_LIMIT,
	SelfServeKeyError,
} from "../services/access/self-serve-keys";
import { resolvePolychatSessionCredential } from "../services/polychat/session";
import { readBoundedJson } from "../utils/body";
import { errorCodeForStatus, errorJson } from "../utils/http";
import { guard, type AppContext } from "./context";

const NO_STORE = { "Cache-Control": "no-store" };

async function ownerOf(c: Context<AppContext>) {
	const credential = await resolvePolychatSessionCredential(c.req.raw, c.env);

	return credential
		? { owner: credential.subjectId }
		: {
				denied: errorJson(
					"Sign in with Polychat on this site to manage API keys.",
					401,
					"unauthorised",
					NO_STORE,
				),
			};
}

function keyError(error: unknown) {
	if (error instanceof SelfServeKeyError) {
		return errorJson(error.message, error.status, errorCodeForStatus(error.status), NO_STORE);
	}

	throw error;
}

export function createKeyRoutes() {
	const routes = new Hono<AppContext>({ strict: false });

	routes.get("/", async (c) => {
		const limited = await guard(c, { policy: "read" });

		if (limited) {
			return limited;
		}

		const access = await ownerOf(c);

		if ("denied" in access) {
			return access.denied;
		}

		return c.json(
			{ keys: await listSelfServeKeys(c.env, access.owner), limit: SELF_SERVE_KEY_LIMIT },
			200,
			NO_STORE,
		);
	});

	routes.post("/", async (c) => {
		const limited = await guard(c, { policy: "write" });

		if (limited) {
			return limited;
		}

		const access = await ownerOf(c);

		if ("denied" in access) {
			return access.denied;
		}

		const body = await readBoundedJson(c);

		try {
			const created = await createSelfServeKey(
				c.env,
				access.owner,
				isRecord(body) ? body.name : undefined,
			);

			return c.json(created, 201, NO_STORE);
		} catch (error) {
			return keyError(error);
		}
	});

	routes.delete("/:id", async (c) => {
		const limited = await guard(c, { policy: "write" });

		if (limited) {
			return limited;
		}

		const access = await ownerOf(c);

		if ("denied" in access) {
			return access.denied;
		}

		try {
			await revokeSelfServeKey(c.env, access.owner, c.req.param("id"));

			return c.body(null, 204, NO_STORE);
		} catch (error) {
			return keyError(error);
		}
	});

	return routes;
}
