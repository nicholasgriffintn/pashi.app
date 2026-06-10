import { formatGeneratedAt } from "../lib/result-format";
import { diceRollRecords, type DiceStageResult, type DiceRollRecord } from "../lib/dice-result";

interface DiceResultViewProps {
	compact?: boolean;
	history?: DiceStageResult[];
	onClearHistory?: () => void;
	onRestoreHistory?: (result: DiceStageResult) => void;
	result: DiceStageResult;
}

interface DiceResultHistoryProps {
	history: DiceStageResult[];
	onClear?: () => void;
	onRestore?: (result: DiceStageResult) => void;
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
			<DiceResultHistory
				history={history}
				onClear={onClearHistory}
				onRestore={onRestoreHistory}
			/>
		</div>
	);
}

export function DiceResultHistory({ history, onClear, onRestore }: DiceResultHistoryProps) {
	if (history.length === 0) {
		return null;
	}

	return (
		<aside className="dice-history" aria-label="Dice roll history">
			<header className="dice-history-header">
				<div>
					<span>Roll history</span>
					<strong>{history.length} previous generation{history.length === 1 ? "" : "s"}</strong>
				</div>
				{onClear ? (
					<button onClick={onClear} type="button">
						Clear
					</button>
				) : null}
			</header>
			<div className="dice-history-list">
				{history.map((result) => {
					const records = diceRollRecords(result);
					const firstRecord = records[0];
					const generatedAt = formatGeneratedAt(result.generatedAt) ?? "Earlier";

					return (
						<button
							className="dice-history-item"
							key={result.generatedAt ?? `${firstRecord?.notation}-${sumTotals(records)}`}
							onClick={() => onRestore?.(result)}
							type="button"
						>
							<span>{generatedAt}</span>
							<strong>{firstRecord?.notation ?? result.label}</strong>
							<small>{records.length} roll{records.length === 1 ? "" : "s"} / total {sumTotals(records)}</small>
							<em>Restore</em>
						</button>
					);
				})}
			</div>
		</aside>
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
