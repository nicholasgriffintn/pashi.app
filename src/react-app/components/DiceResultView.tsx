import { diceRollRecords, type DiceStageResult, type DiceRollRecord } from "../lib/dice-result";
import type { TextResultStageValue } from "../lib/result-types";
import { ResultHistory, type ResultHistoryDescription } from "./ResultHistory";

interface DiceResultViewProps {
	compact?: boolean;
	generatedAtLabel: string;
	history?: DiceStageResult[];
	onClearHistory?: () => void;
	onRestoreHistory?: (result: TextResultStageValue) => void;
	result: DiceStageResult;
}

const PIP_POSITIONS: Record<number, readonly string[]> = {
	1: ["center"],
	2: ["top-left", "bottom-right"],
	3: ["top-left", "center", "bottom-right"],
	4: ["top-left", "top-right", "bottom-left", "bottom-right"],
	5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
	6: ["top-left", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-right"],
};

export function DiceResultView({
	compact = false,
	generatedAtLabel,
	history = [],
	onClearHistory,
	onRestoreHistory,
	result,
}: DiceResultViewProps) {
	const records = diceRollRecords(result);
	const firstRecord = records[0];
	const grandTotal = sumTotals(records);

	return (
		<div className="dice-result-view" data-compact={compact}>
			<header className="dice-result-header">
				<div>
					<span>Dice roll</span>
					<strong>{firstRecord?.notation ?? result.label}</strong>
				</div>
				<div>
					<span>{records.length === 1 ? "Total" : "Grand total"}</span>
					<strong>{grandTotal}</strong>
				</div>
			</header>
			<div className="dice-roll-stack">
				{records.map((record, index) => (
					<DiceRollCard key={`${record.roll}-${record.total}-${index}`} record={record} />
				))}
			</div>
			<ResultHistory
				describeResult={describeDiceHistory}
				generatedAtLabel={generatedAtLabel}
				history={history}
				onClear={onClearHistory}
				onRestore={onRestoreHistory}
				title="Roll history"
			/>
		</div>
	);
}

function DiceRollCard({ record }: { record: DiceRollRecord }) {
	const rollValues = splitRollValues(record.rolls);

	return (
		<article className="dice-roll-card">
			<div className="dice-roll-card-header">
				<span>Roll {record.roll}</span>
				<strong>{record.total}</strong>
			</div>
			{rollValues.length > 0 ? (
				<div className="dice-face-row">
					{rollValues.map((value, index) => (
						<DiceFace diceType={record.diceType} key={`${value}-${index}`} value={value} />
					))}
				</div>
			) : null}
			<dl className="dice-roll-metrics">
				<div>
					<dt>Subtotal</dt>
					<dd>{record.subtotal}</dd>
				</div>
				<div>
					<dt>Modifier</dt>
					<dd>{record.modifier}</dd>
				</div>
				<div>
					<dt>Dice</dt>
					<dd>{record.diceType}</dd>
				</div>
				{record.keptRolls ? (
					<div>
						<dt>Kept</dt>
						<dd>{record.keptRolls}</dd>
					</div>
				) : null}
				{record.droppedRolls ? (
					<div>
						<dt>Dropped</dt>
						<dd>{record.droppedRolls}</dd>
					</div>
				) : null}
			</dl>
		</article>
	);
}

function DiceFace({ diceType, value }: { diceType: string; value: string }) {
	const numericValue = Number.parseInt(value, 10);
	const sides = Number.parseInt(diceType.replace(/^d/i, ""), 10);
	const pipPositions = sides <= 6 ? PIP_POSITIONS[numericValue] : undefined;

	return (
		<span className="dice-face" data-show-pips={Boolean(pipPositions)}>
			{pipPositions ? (
				pipPositions.map((position) => <span data-position={position} key={position} />)
			) : (
				value
			)}
		</span>
	);
}

function splitRollValues(value: string | undefined) {
	if (!value) {
		return [];
	}

	return value
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item !== "");
}

function sumTotals(records: readonly DiceRollRecord[]) {
	return records.reduce((sum, record) => sum + Number.parseInt(record.total, 10), 0);
}

function describeDiceHistory(result: TextResultStageValue): ResultHistoryDescription {
	if (result.type !== "dice" || result.kind !== "fields") {
		return { heading: result.label, meta: result.meta };
	}

	const records = diceRollRecords(result as DiceStageResult);
	const firstRecord = records[0];

	return {
		heading: firstRecord?.notation ?? result.label,
		meta: `${records.length} roll${records.length === 1 ? "" : "s"} / total ${sumTotals(records)}`,
	};
}
