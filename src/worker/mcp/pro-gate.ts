import type { AiClient } from "../ai/run";
import { isPolychatPro, type PolychatSessionEnv } from "../services/polychat/session";

export async function requirePolychatPro(
	env: PolychatSessionEnv,
	ai: AiClient | undefined,
	app: string,
	purpose: string,
): Promise<AiClient> {
	if (!ai) {
		throw new Error(
			`${app} runs on Polychat. Connect Pashi through your Polychat link to ${purpose}.`,
		);
	}

	if (!(await isPolychatPro(env, ai.apiKey))) {
		throw new Error(`${app} is a Polychat Pro app. Upgrade your Polychat plan to ${purpose}.`);
	}

	return ai;
}
