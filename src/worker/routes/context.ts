import type { Context } from "hono";

import type { PolychatVariables } from "../middleware/polychat-access";
import { enforceRateLimit } from "../security/guard";
import { type PolicyName, policyFor } from "../security/policies";
import type { ApiKeyEnv } from "../services/access/api-keys";
import type { ConversionEnv } from "../services/converters/conversion-pipeline";
import type { EventEnv } from "../services/events";
import type { StatsEnv } from "../services/stats";

export type WorkerEnv = ConversionEnv & ApiKeyEnv & EventEnv & StatsEnv;

export type AppContext = {
	Bindings: WorkerEnv;
	Variables: PolychatVariables;
};

export interface GuardOptions {
	fetchesNetwork?: boolean;
	isAiMode?: boolean;
	isContainerRuntime?: boolean;
	isExpensiveGenerator?: boolean;
	isUpload?: boolean;
	policy?: PolicyName;
	usesAiBinding?: boolean;
}

export async function guard(c: Context<AppContext>, options: GuardOptions = {}) {
	return enforceRateLimit({
		applicationId: c.get("application")?.id ?? c.get("polychat")?.subjectId,
		env: c.env,
		policy:
			options.policy ??
			policyFor({
				isAiMode: options.isAiMode ?? false,
				isContainerRuntime: options.isContainerRuntime ?? false,
				isExpensiveGenerator: options.isExpensiveGenerator ?? false,
				isUpload: options.isUpload ?? false,
				method: c.req.method,
				fetchesNetwork: options.fetchesNetwork ?? false,
				usesAiBinding: options.usesAiBinding ?? false,
			}),
		request: c.req.raw,
	});
}
