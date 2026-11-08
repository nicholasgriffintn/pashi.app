import { isRecord } from "../../../shared/records";

export interface DecisionChoice {
	choice: string;
	confidence: number;
	probabilities: Record<string, number>;
}

export interface DecisionScore {
	legend: Record<string, unknown>;
	score: number;
}

export function readDecisionAnswers(response: unknown): Record<string, unknown> {
	if (!isRecord(response) || !isRecord(response.answers)) {
		throw new Error("Polychat gave a decision Pashi could not read.");
	}

	return response.answers;
}

export function readDecisionChoice(answer: unknown): DecisionChoice | undefined {
	if (!isRecord(answer) || answer.type !== "choice" || !isRecord(answer.probabilities)) {
		return undefined;
	}

	return {
		choice: typeof answer.choice === "string" ? answer.choice : "",
		confidence: typeof answer.confidence === "number" ? answer.confidence : 0,
		probabilities: Object.fromEntries(
			Object.entries(answer.probabilities).filter(
				(entry): entry is [string, number] => typeof entry[1] === "number",
			),
		),
	};
}

export function readDecisionNoul(answer: unknown) {
	return isRecord(answer) && answer.type === "noul" && typeof answer.noul === "number"
		? answer.noul
		: 0;
}

export function readDecisionScore(answer: unknown): DecisionScore | undefined {
	return isRecord(answer) &&
		answer.type === "score" &&
		typeof answer.score === "number" &&
		isRecord(answer.legend)
		? { legend: answer.legend, score: answer.score }
		: undefined;
}

export function roundDecisionScore(answer: DecisionScore) {
	const topLevel = Object.keys(answer.legend).length - 1;

	return Math.min(topLevel, Math.max(0, Math.round(answer.score)));
}

export function normaliseDecisionScore(answer: DecisionScore) {
	const topLevel = Object.keys(answer.legend).length - 1;

	return topLevel > 0 ? Math.min(1, Math.max(0, answer.score / topLevel)) : 0;
}
