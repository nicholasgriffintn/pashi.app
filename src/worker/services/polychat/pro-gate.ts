import type { AiClient } from "../../ai/run";
import { PolychatError } from "./client";
import { isPolychatPro, type PolychatSessionEnv } from "./session";

export async function requirePolychatPro(
	env: PolychatSessionEnv,
	ai: AiClient | undefined,
	app: string,
	purpose: string,
): Promise<AiClient> {
	if (!ai) {
		throw new PolychatError(
			`${app} runs on Polychat. Connect Pashi through your Polychat link to ${purpose}.`,
			401,
			"unauthorised",
		);
	}

	if (!(await isPolychatPro(env, ai.apiKey))) {
		throw new PolychatError(
			`${app} is a Polychat Pro app. Upgrade your Polychat plan to ${purpose}.`,
			403,
			"forbidden",
		);
	}

	return ai;
}
