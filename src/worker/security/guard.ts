import { errorJson } from "../utils/http";
import { RATE_POLICIES, type PolicyName } from "./policies";

export interface RateLimitEnv {
	RATE_LIMIT_EXPENSIVE?: RateLimit;
	RATE_LIMIT_READ?: RateLimit;
	RATE_LIMIT_WRITE?: RateLimit;
}

export interface RateLimitCheck {
	applicationId?: string;
	env: RateLimitEnv;
	policy: PolicyName;
	request: Request;
}

function bucketKey(request: Request, applicationId?: string) {
	if (applicationId) {
		return `app:${applicationId}`;
	}

	return `ip:${request.headers.get("cf-connecting-ip") ?? "unknown"}`;
}

export async function enforceRateLimit({
	applicationId,
	env,
	policy,
	request,
}: RateLimitCheck): Promise<Response | undefined> {
	const { limiter, message } = RATE_POLICIES[policy];
	const binding = env[limiter];

	if (!binding) {
		return undefined;
	}

	const outcome = await binding.limit({ key: bucketKey(request, applicationId) });

	if (outcome.success) {
		return undefined;
	}

	return errorJson(message, 429, "rate_limited", {
		"Cache-Control": "no-store",
		"Retry-After": "60",
	});
}
