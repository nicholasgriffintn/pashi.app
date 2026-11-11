import type { Context } from "hono";

import type { AiClient } from "../ai/run";
import type { ApiKeyEnv } from "../services/access/api-keys";
import type { PolychatEnv } from "../services/polychat/client";
import {
	isPolychatPro,
	resolvePolychatCredential,
	type PolychatCredential,
} from "../services/polychat/session";
import { errorJson } from "../utils/http";
import { requireApiKey, type ApiKeyVariables } from "./api-key-access";

export interface PolychatVariables extends ApiKeyVariables {
	polychat?: PolychatCredential;
}

type PolychatContext = {
	Bindings: ApiKeyEnv & PolychatEnv;
	Variables: PolychatVariables;
};

export async function attachPolychat<E extends PolychatContext>(c: Context<E>) {
	const credential = await resolvePolychatCredential(c.req.raw, c.env);

	if (credential) {
		c.set("polychat", credential);
	}

	return credential;
}

export async function requirePolychat<E extends PolychatContext>(c: Context<E>) {
	if (!(await attachPolychat(c))) {
		return errorJson("Connect Polychat to use AI.", 401, "unauthorised", {
			"Cache-Control": "no-store",
		});
	}

	return undefined;
}

export function aiClientFor<E extends PolychatContext>(c: Context<E>): AiClient | undefined {
	const credential = c.get("polychat");

	return credential ? { apiKey: credential.apiKey, env: c.env } : undefined;
}

const FREE_KEY_REFUSAL =
	"Your Pashi API key covers the free tools. Media conversion and the AI media tools need Polychat Pro.";

export async function requireConversionAccess<E extends PolychatContext>(c: Context<E>) {
	const denied = await requireApiKey(c);

	if (!denied && c.get("application")?.tier === "full") {
		return undefined;
	}

	const credential = await resolvePolychatCredential(c.req.raw, c.env);

	if (!credential) {
		return denied ?? errorJson(FREE_KEY_REFUSAL, 403, "forbidden", { "Cache-Control": "no-store" });
	}

	if (!(await isPolychatPro(c.env, credential.apiKey))) {
		return errorJson(
			denied ? "Media conversion needs Polychat Pro." : FREE_KEY_REFUSAL,
			403,
			"forbidden",
			{ "Cache-Control": "no-store" },
		);
	}

	c.set("application", {
		enabled: true,
		id: credential.subjectId,
		name: "Polychat",
		tier: "full",
	});

	return undefined;
}

export async function resolveAgentAccess<E extends PolychatContext>(c: Context<E>) {
	if (await attachPolychat(c)) {
		return undefined;
	}

	return requireApiKey(c, { allowAbsent: true });
}
