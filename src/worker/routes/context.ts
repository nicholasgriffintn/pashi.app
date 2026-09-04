import type { Context } from "hono";

import type { ApiKeyVariables } from "../middleware/api-key-access";
import { enforceRateLimit } from "../security/guard";
import { policyFor } from "../security/policies";
import type { ApiKeyEnv } from "../services/access/api-keys";
import type { ConversionEnv } from "../services/converters/conversion-pipeline";
import type { EventEnv } from "../services/events";

export type WorkerEnv = ConversionEnv & ApiKeyEnv & EventEnv;

export type AppContext = {
	Bindings: WorkerEnv;
	Variables: ApiKeyVariables;
};

export interface GuardOptions {
	isAiMode?: boolean;
	isContainerRuntime?: boolean;
	isExpensiveGenerator?: boolean;
	isUpload?: boolean;
}

export async function guard(c: Context<AppContext>, options: GuardOptions = {}) {
	return enforceRateLimit({
		applicationId: c.get("application")?.id,
		env: c.env,
		policy: policyFor({
			isAiMode: options.isAiMode ?? false,
			isContainerRuntime: options.isContainerRuntime ?? false,
			isExpensiveGenerator: options.isExpensiveGenerator ?? false,
			isUpload: options.isUpload ?? false,
			method: c.req.method,
		}),
		request: c.req.raw,
	});
}
