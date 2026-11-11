import { truncateEnd } from "../shared/text";
import type { PolisStatus } from "./engine/protocol";
import { formatCount, formatMoney, formatPercent, yearOf } from "./format";
import type { MonthlyMetrics } from "./library/index";

const CONTEXT_LABEL = "Pashi Polis state:";
const CONTEXT_LAWS = 6;
const CONTEXT_EVENTS = 6;
const CONTEXT_NAME_LENGTH = 60;
const CONTEXT_LAW_TITLE_LENGTH = 80;
const CONTEXT_LAW_SUMMARY_LENGTH = 90;

function describeIndicators(latest: MonthlyMetrics | null) {
	if (!latest) {
		return ["Indicators: none yet, the first month has not ended"];
	}

	return [
		`Population: ${formatCount(latest.population)} (${latest.firms} firms)`,
		`Unemployment: ${formatPercent(latest.unemploymentPct)}`,
		`Mood: ${latest.mood.toFixed(0)}/100`,
		`Council approval: ${formatPercent(latest.approvalPct)}`,
		`Median savings: ${formatMoney(latest.medianWealth)}`,
		`Average rent: ${formatMoney(latest.averageRent)}`,
		`Homeless: ${formatCount(latest.homeless)}, protesting: ${formatCount(latest.protesters)}`,
	];
}

export function townTurnKey({ branch, playback, snapshot }: PolisStatus) {
	return [
		snapshot.name,
		snapshot.year,
		branch,
		playback ? "history" : "live",
		snapshot.laws.map((law) => law.id).join(","),
		snapshot.shocks.map((shock) => shock.kind).join(","),
	].join("|");
}

export function describeNoTown() {
	return [CONTEXT_LABEL, "No town is running. The setup screen is showing."].join("\n");
}

export function describeTown({ branch, branches, playback, snapshot }: PolisStatus) {
	const laws = snapshot.laws.slice(-CONTEXT_LAWS);
	const events = snapshot.shocks
		.slice(0, CONTEXT_EVENTS)
		.map((shock) => shock.kind.replaceAll("_", " "));
	const lines = [
		CONTEXT_LABEL,
		`Town: ${truncateEnd(snapshot.name, CONTEXT_NAME_LENGTH)}`,
		`Year: ${snapshot.year}${playback ? " (watching recorded history, not the present)" : ""}`,
		...describeIndicators(snapshot.latest),
	];

	if (branches.length > 1) {
		lines.push(
			`Futures running side by side: ${branches.length}, watching “${truncateEnd(branches[branch] ?? "", CONTEXT_NAME_LENGTH)}”`,
		);
	}

	lines.push(
		snapshot.laws.length > laws.length
			? `Laws in force (latest ${laws.length} of ${snapshot.laws.length}):`
			: `Laws in force (${laws.length}):`,
		...laws.map(
			(law) =>
				`- “${truncateEnd(law.title, CONTEXT_LAW_TITLE_LENGTH)}”, passed in year ${yearOf(law.day)}: ${truncateEnd(law.summary, CONTEXT_LAW_SUMMARY_LENGTH)}`,
		),
		`Active events: ${events.length > 0 ? events.join(", ") : "none"}`,
	);

	return lines.join("\n");
}
