import { routeRequestToTool } from "../../services/labs/ask";
import { explainInput } from "../../services/labs/explain";
import type { AiClient } from "../run";
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

async function runRouteCases(ai: AiClient): Promise<EvaluationCaseResult[]> {
	const results: EvaluationCaseResult[] = [];

	for (const testCase of ROUTE_CASES) {
		try {
			const route = await routeRequestToTool(ai, testCase.request);
			const toolPassed = testCase.acceptableToolIds.includes(route.toolId);
			const wrongFields =
				route.toolId === testCase.expectedToolId
					? Object.entries(testCase.expectedFields ?? {}).filter(
							([id, value]) => route.fields[id] !== value,
						)
					: [];
			const passed = toolPassed && wrongFields.length === 0;

			results.push({
				detail: !toolPassed
					? `chose ${route.toolId}, expected one of ${testCase.acceptableToolIds.join(", ")}`
					: wrongFields.length > 0
						? `chose ${route.toolId}, but ${wrongFields.map(([id, value]) => `${id} was ${route.fields[id] ?? "unset"}, expected ${value}`).join("; ")}`
						: `chose ${route.toolId}`,
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

async function runExplainCases(ai: AiClient): Promise<EvaluationCaseResult[]> {
	const results: EvaluationCaseResult[] = [];

	for (const testCase of EXPLAIN_CASES) {
		try {
			const explanation = await explainInput(ai, testCase.subject, testCase.input);
			const haystack =
				`${explanation.summary} ${explanation.parts.map((part) => `${part.piece} ${part.detail}`).join(" ")} ${explanation.warnings.join(" ")}`.toLowerCase();
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

export async function runEvaluation(ai: AiClient): Promise<EvaluationReport> {
	const cases = [...(await runRouteCases(ai)), ...(await runExplainCases(ai))];
	const passed = cases.filter((entry) => entry.passed).length;

	return {
		cases,
		failed: cases.length - passed,
		passed,
		total: cases.length,
	};
}
