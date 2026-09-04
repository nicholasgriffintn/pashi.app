import { routeRequestToTool } from "../../services/labs/ask";
import { explainInput } from "../../services/labs/explain";
import type { AiEnv } from "../run";
import { EXPLAIN_CASES, ROUTE_CASES } from "./cases";

export interface EvaluationCaseResult {
	detail: string;
	name: string;
	passed: boolean;
}

export interface EvaluationReport {
	cases: EvaluationCaseResult[];
	failed: number;
	passed: number;
	total: number;
}

async function runRouteCases(env: AiEnv): Promise<EvaluationCaseResult[]> {
	const results: EvaluationCaseResult[] = [];

	for (const testCase of ROUTE_CASES) {
		try {
			const route = await routeRequestToTool(env, testCase.request);
			const passed = testCase.acceptableToolIds.includes(route.toolId);

			results.push({
				detail: passed
					? `chose ${route.toolId}`
					: `chose ${route.toolId}, expected one of ${testCase.acceptableToolIds.join(", ")}`,
				name: `route: ${testCase.request}`,
				passed,
			});
		} catch (error) {
			results.push({
				detail: error instanceof Error ? error.message : "threw",
				name: `route: ${testCase.request}`,
				passed: false,
			});
		}
	}

	return results;
}

async function runExplainCases(env: AiEnv): Promise<EvaluationCaseResult[]> {
	const results: EvaluationCaseResult[] = [];

	for (const testCase of EXPLAIN_CASES) {
		try {
			const explanation = await explainInput(env, testCase.subject, testCase.input);
			const haystack =
				`${explanation.summary} ${explanation.parts.map((part) => `${part.piece} ${part.detail}`).join(" ")}`.toLowerCase();
			const missing = testCase.mustMention.filter((term) => !haystack.includes(term.toLowerCase()));

			results.push({
				detail: missing.length === 0 ? "mentioned every term" : `missing ${missing.join(", ")}`,
				name: `explain ${testCase.subject}`,
				passed: missing.length === 0,
			});
		} catch (error) {
			results.push({
				detail: error instanceof Error ? error.message : "threw",
				name: `explain ${testCase.subject}`,
				passed: false,
			});
		}
	}

	return results;
}

export async function runEvaluation(env: AiEnv): Promise<EvaluationReport> {
	const cases = [...(await runRouteCases(env)), ...(await runExplainCases(env))];
	const passed = cases.filter((entry) => entry.passed).length;

	return {
		cases,
		failed: cases.length - passed,
		passed,
		total: cases.length,
	};
}
