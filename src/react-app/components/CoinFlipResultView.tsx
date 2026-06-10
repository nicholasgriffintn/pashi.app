import { coinFlipValues, isCoinFlipStageResult, type CoinFlipStageResult } from "../lib/coin-result";
import type { TextResultStageValue } from "../lib/result-types";
import { ResultHistory, type ResultHistoryDescription } from "./ResultHistory";

interface CoinFlipResultViewProps {
	generatedAtLabel: string;
	history?: TextResultStageValue[];
	onClearHistory?: () => void;
	onRestoreHistory?: (result: TextResultStageValue) => void;
	result: CoinFlipStageResult;
}

export function CoinFlipResultView({
	generatedAtLabel,
	history = [],
	onClearHistory,
	onRestoreHistory,
	result,
}: CoinFlipResultViewProps) {
	const flips = coinFlipValues(result);
	const heads = flips.filter((flip) => normaliseFlip(flip) === "heads").length;
	const tails = flips.length - heads;

	return (
		<div className="coin-result-view">
			<header className="coin-result-header">
				<div>
					<span>Coin flip</span>
					<strong>{flips.length} flip{flips.length === 1 ? "" : "s"}</strong>
				</div>
				<div>
					<span>Heads</span>
					<strong>{heads}</strong>
				</div>
				<div>
					<span>Tails</span>
					<strong>{tails}</strong>
				</div>
			</header>
			<div className="coin-stack">
				{flips.map((flip, index) => (
					<span className="coin-face" data-side={normaliseFlip(flip)} key={`${flip}-${index}`}>
						{coinLabel(flip)}
					</span>
				))}
			</div>
			<ResultHistory
				describeResult={describeCoinHistory}
				generatedAtLabel={generatedAtLabel}
				history={history}
				onClear={onClearHistory}
				onRestore={onRestoreHistory}
				title="Flip history"
			/>
		</div>
	);
}

function describeCoinHistory(result: TextResultStageValue): ResultHistoryDescription {
	if (!isCoinFlipStageResult(result)) {
		return { heading: result.label, meta: result.meta };
	}

	const flips = coinFlipValues(result);
	const heads = flips.filter((flip) => normaliseFlip(flip) === "heads").length;
	const tails = flips.length - heads;

	return {
		heading: `${flips.length} flip${flips.length === 1 ? "" : "s"}`,
		meta: `Heads ${heads} / Tails ${tails}`,
	};
}

function normaliseFlip(value: string) {
	return value.trim().toLowerCase() === "heads" ? "heads" : "tails";
}

function coinLabel(value: string) {
	return normaliseFlip(value) === "heads" ? "H" : "T";
}
