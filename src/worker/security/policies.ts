export type LimiterName = {
	[Key in keyof Env]-?: Env[Key] extends RateLimit ? Key : never;
}[keyof Env];

export type PolicyName = "expensive" | "read" | "write";

export interface RatePolicy {
	limiter: LimiterName;
	message: string;
}

export const RATE_POLICIES: Record<PolicyName, RatePolicy> = {
	expensive: {
		limiter: "RATE_LIMIT_EXPENSIVE",
		message: "That tool is expensive to run. Wait a moment and try again.",
	},
	read: {
		limiter: "RATE_LIMIT_READ",
		message: "Too many requests. Slow down and try again shortly.",
	},
	write: {
		limiter: "RATE_LIMIT_WRITE",
		message: "Too many submissions. Wait a moment and try again.",
	},
};

export interface PolicyInput {
	isAiMode: boolean;
	isContainerRuntime: boolean;
	isExpensiveGenerator: boolean;
	isUpload: boolean;
	method: string;
	fetchesNetwork?: boolean;
	usesAiBinding?: boolean;
}

const COMBINATORIAL_GENERATOR_IDS = new Set([
	"dice-probability",
	"encryption-key",
	"jwt-token",
	"number",
	"ssh-key",
]);

export function isExpensiveGeneratorId(id: string) {
	return COMBINATORIAL_GENERATOR_IDS.has(id);
}

export function policyFor(input: PolicyInput): PolicyName {
	if (
		input.isAiMode ||
		input.isContainerRuntime ||
		input.isUpload ||
		input.isExpensiveGenerator ||
		input.usesAiBinding ||
		input.fetchesNetwork
	) {
		return "expensive";
	}

	return input.method === "GET" || input.method === "HEAD" ? "read" : "write";
}
