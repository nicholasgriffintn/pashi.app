import { formatGeneratedAt } from "../lib/result-format";
import { createResultSummary } from "../lib/result-summary";
import type { TextResultStageValue } from "../lib/result-types";

export interface ResultHistoryDescription {
	heading: string;
	meta: string;
}

interface ResultHistoryProps {
	describeResult?: (result: TextResultStageValue) => ResultHistoryDescription;
	generatedAtLabel: string;
	history: TextResultStageValue[];
	onClear?: () => void;
	onRestore?: (result: TextResultStageValue) => void;
	title?: string;
}

export function ResultHistory({
	describeResult,
	generatedAtLabel,
	history,
	onClear,
	onRestore,
	title = "Result history",
}: ResultHistoryProps) {
	if (history.length === 0) {
		return null;
	}
	const describe = describeResult ?? ((result: TextResultStageValue) => describeGenericResult(result, generatedAtLabel));

	return (
		<aside className="result-history" aria-label={title}>
			<header className="result-history-header">
				<div>
					<span>{title}</span>
					<strong>{history.length} previous generation{history.length === 1 ? "" : "s"}</strong>
				</div>
				{onClear ? (
					<button onClick={onClear} type="button">
						Clear
					</button>
				) : null}
			</header>
			<div className="result-history-list">
				{history.map((result) => {
					const description = describe(result);
					const generatedAt = formatGeneratedAt(result.generatedAt) ?? "Earlier";

					return (
						<button
							className="result-history-item"
							key={result.generatedAt ?? `${result.type}-${description.heading}-${description.meta}`}
							onClick={() => onRestore?.(result)}
							type="button"
						>
							<span>{generatedAt}</span>
							<strong>{description.heading}</strong>
							<small>{description.meta}</small>
							<em>Restore</em>
						</button>
					);
				})}
			</div>
		</aside>
	);
}

function describeGenericResult(result: TextResultStageValue, generatedAtLabel: string) {
	const summary = createResultSummary(result, generatedAtLabel);

	return {
		heading: summary.title,
		meta: summary.stat || generatedAtFallback(result.generatedAt),
	};
}

function generatedAtFallback(value: string | undefined) {
	return value ? `Generated ${formatGeneratedAt(value) ?? value}` : "Generated";
}
