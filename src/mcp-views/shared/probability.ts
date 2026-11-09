const VERBAL_SCALE: [number, string][] = [
	[0.95, "Almost certainly"],
	[0.8, "Very likely"],
	[0.62, "Probably"],
	[0.38, "Hard to say"],
	[0.2, "Probably not"],
	[0.05, "Very unlikely"],
	[0, "Almost certainly not"],
];

export type ProbabilityTone = "middling" | "strong" | "weak";

export function describeProbability(probability: number) {
	return VERBAL_SCALE.find(([floor]) => probability >= floor)?.[1] ?? "Almost certainly not";
}

export function probabilityTone(probability: number): ProbabilityTone {
	if (probability >= 0.75) {
		return "strong";
	}

	return probability >= 0.4 ? "middling" : "weak";
}

export function formatProbabilityPercent(probability: number) {
	return `${Math.round(Math.min(1, Math.max(0, probability)) * 100)}%`;
}
