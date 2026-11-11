import { formatProbabilityPercent } from "../../../shared-ui/probability";
import { POLIS_ACTION_LABELS, POLIS_ACTIONS } from "../../../shared/polis";
import { formatCompactCount } from "../../shared/numbers";
import { POLIS_MODEL_BUDGETS, type PolisStatus } from "../engine/protocol";
import type { PolisEngine } from "../usePolisEngine";

const MODELS = [
	{ value: "", label: "Automatic" },
	{ value: "jev-latest", label: "Jev" },
	{ value: "@cf/cloudflare/clef-flash", label: "Clef Flash" },
	{ value: "@cf/cloudflare/clef", label: "Clef" },
];

function budgetLabel(budget: number): string {
	if (budget === 0) {
		return "Off";
	}

	return Number.isFinite(budget) ? formatCompactCount(budget) : "No limit";
}

export function MindsPanel({ engine, status }: { engine: PolisEngine; status: PolisStatus }) {
	const { modelSettings, setModelSettings } = engine;
	const { decisions, snapshot } = status;
	const totals = POLIS_ACTIONS.map((action) => ({
		action,
		count: snapshot.actionTotals[action] ?? 0,
	})).sort((first, second) => second.count - first.count);
	const largest = Math.max(1, ...totals.map((row) => row.count));

	return (
		<div className="polis-stack polis-stack-wide">
			<section className="polis-stack">
				<p>
					Daily life runs on simple rules. Big choices come from a decision model, asked once per
					kind of person, and everyone of that kind rolls against its answer.
				</p>
				<p className="polis-mono">
					{formatProbabilityPercent(snapshot.decisions.modelShare)} of choices so far used the model
				</p>
			</section>

			<section className="polis-stack">
				<h3 className="polis-heading">Questions per simulated year</h3>
				<div role="group" aria-label="Question budget" className="polis-budgets">
					{POLIS_MODEL_BUDGETS.map((budget) => (
						<button
							key={budget}
							type="button"
							aria-pressed={modelSettings.callsPerYear === budget}
							className="polis-segment polis-segment-boxed"
							onClick={() => setModelSettings({ ...modelSettings, callsPerYear: budget })}
						>
							{budgetLabel(budget)}
						</button>
					))}
				</div>
				<label className="polis-model">
					<span>Model</span>
					<select
						value={modelSettings.model ?? ""}
						onChange={(event) =>
							setModelSettings({ ...modelSettings, model: event.target.value || undefined })
						}
					>
						{MODELS.map((model) => (
							<option key={model.value} value={model.value}>
								{model.label}
							</option>
						))}
					</select>
				</label>
				<label className="polis-check">
					<input
						type="checkbox"
						checked={modelSettings.holdForAnswers}
						onChange={(event) =>
							setModelSettings({ ...modelSettings, holdForAnswers: event.target.checked })
						}
					/>
					<span>Wait for the model each month, so no choice falls back to the simple rules</span>
				</label>
			</section>

			<section className="polis-stack">
				<h3 className="polis-heading">So far</h3>
				<dl className="polis-pairs">
					<dt>Answers</dt>
					<dd className="polis-mono">{decisions.calls.toLocaleString("en-GB")}</dd>
					<dt>Tokens read</dt>
					<dd className="polis-mono">{formatCompactCount(decisions.tokens)}</dd>
					<dt>Kinds of person known</dt>
					<dd className="polis-mono">{snapshot.decisions.modelBuckets}</dd>
					<dt>Waiting to ask</dt>
					<dd className="polis-mono">{snapshot.decisions.pending}</dd>
					<dt>Model</dt>
					<dd className="polis-mono polis-truncate">{decisions.model ?? "None yet"}</dd>
				</dl>
				{decisions.error ? (
					<p className="polis-small">
						The model is busy, so simple rules are filling in and it will be asked again shortly.
					</p>
				) : null}
			</section>

			{decisions.recent.length > 0 ? (
				<section className="polis-stack">
					<h3 className="polis-heading">What the model just said</h3>
					<ul className="polis-list">
						{decisions.recent.map((row, index) => (
							<li key={`${row.label}-${index}`} className="polis-small-text">
								<span className="polis-faint">{row.label}:</span> {row.action.toLowerCase()}{" "}
								<span className="polis-mono">{formatProbabilityPercent(row.probability)}</span>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<section className="polis-stack">
				<h3 className="polis-heading">What people have done</h3>
				{totals.map(({ action, count }) => (
					<div key={action} className="polis-bar-row polis-bar-row-actions">
						<span className="polis-faint">{POLIS_ACTION_LABELS[action]}</span>
						<span className="polis-bar">
							<span className="polis-bar-fill" style={{ width: `${(count / largest) * 100}%` }} />
						</span>
						<span className="polis-mono polis-right">{formatCompactCount(count)}</span>
					</div>
				))}
			</section>
		</div>
	);
}
