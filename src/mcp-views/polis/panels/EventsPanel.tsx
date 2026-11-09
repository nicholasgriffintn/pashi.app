import { useState, type FormEvent } from "react";

import {
	POLIS_DRAFT_LENGTH,
	type PolisScenario,
	type PolisScenarioKind,
} from "../../../shared/polis";
import { errorMessage } from "../../shared/errors";
import { Button } from "../Button";
import type { IconName } from "../icons";
import { Icon } from "../icons";
import { polisService } from "../service";
import type { PolisEngine } from "../usePolisEngine";

const PRESETS: {
	kind: PolisScenarioKind;
	title: string;
	summary: string;
	months: number;
	icon: IconName;
}[] = [
	{
		kind: "recession",
		title: "A recession hits",
		summary: "Spending and exports fall away.",
		months: 24,
		icon: "trendingDown",
	},
	{
		kind: "boom",
		title: "A boom arrives",
		summary: "Confidence and orders surge.",
		months: 24,
		icon: "trendingUp",
	},
	{
		kind: "epidemic",
		title: "An epidemic spreads",
		summary: "Far more people die while it lasts.",
		months: 12,
		icon: "biohazard",
	},
	{
		kind: "factory_closures",
		title: "The big factories close",
		summary: "The largest exporters shut overnight.",
		months: 1,
		icon: "factory",
	},
	{
		kind: "flood",
		title: "The river floods",
		summary: "Homes near the water are destroyed.",
		months: 1,
		icon: "waves",
	},
	{
		kind: "housing_crash",
		title: "House prices crash",
		summary: "Prices drop and confidence goes with them.",
		months: 18,
		icon: "home",
	},
	{
		kind: "immigration_wave",
		title: "A wave of arrivals",
		summary: "Thousands move in looking for work and homes.",
		months: 12,
		icon: "plane",
	},
	{
		kind: "baby_boom",
		title: "A baby boom",
		summary: "Birth rates climb for years.",
		months: 48,
		icon: "baby",
	},
];

export function EventsPanel({ engine }: { engine: PolisEngine }) {
	const [severity, setSeverity] = useState(0.6);
	const [text, setText] = useState("");
	const [busy, setBusy] = useState(false);
	const [draft, setDraft] = useState<PolisScenario | null>(null);
	const [refusal, setRefusal] = useState<string | null>(null);

	const stage = async (event: FormEvent) => {
		event.preventDefault();
		setBusy(true);
		setRefusal(null);
		setDraft(null);

		try {
			const result = await polisService.draftScenario({ text: text.trim() });

			if (result.status === "possible") {
				setDraft(result.scenario);
			} else {
				setRefusal(result.reason);
			}
		} catch (caught) {
			setRefusal(errorMessage(caught, "That could not be staged"));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="polis-stack polis-stack-wide">
			<section className="polis-stack">
				<label className="polis-slider">
					<span className="polis-slider-head">
						<span>How bad</span>
						<span className="polis-mono">{Math.round(severity * 100)}%</span>
					</span>
					<input
						type="range"
						min={0.1}
						max={1}
						step={0.05}
						value={severity}
						aria-label="How bad"
						onChange={(event) => setSeverity(Number(event.target.value))}
						className="polis-range"
					/>
				</label>
				<div className="polis-presets">
					{PRESETS.map(({ icon, ...preset }) => (
						<button
							key={preset.kind}
							type="button"
							className="polis-preset"
							onClick={() =>
								engine.send({
									type: "scenario",
									scenario: {
										kind: preset.kind,
										months: preset.months,
										severity,
										summary: preset.summary,
										title: preset.title,
									},
								})
							}
						>
							<Icon name={icon} />
							<span className="polis-small-strong">{preset.title}</span>
							<span className="polis-small">{preset.summary}</span>
						</button>
					))}
				</div>
			</section>

			<section className="polis-stack">
				<h3 className="polis-heading">Something else</h3>
				<form onSubmit={(event) => void stage(event)} className="polis-stack">
					<textarea
						value={text}
						onChange={(event) => setText(event.target.value)}
						maxLength={POLIS_DRAFT_LENGTH.max}
						rows={2}
						placeholder="A meteor lands on the shopping district"
						aria-label="Describe an event"
					/>
					<div>
						<Button
							type="submit"
							variant="primary"
							size="sm"
							icon="zap"
							isLoading={busy}
							disabled={text.trim().length < POLIS_DRAFT_LENGTH.min}
						>
							Stage it
						</Button>
					</div>
				</form>
				{refusal ? <p className="polis-error">{refusal}</p> : null}
				{draft ? (
					<div className="polis-draft">
						<p className="polis-card-title">{draft.title}</p>
						<p className="polis-small-text">{draft.summary}</p>
						<p className="polis-mono">
							{Math.round(draft.severity * 100)}% severity · {draft.months} months
						</p>
						<div className="polis-inline">
							<Button
								variant="primary"
								size="xs"
								onClick={() => {
									engine.send({ type: "scenario", scenario: draft });
									setDraft(null);
									setText("");
								}}
							>
								Let it happen
							</Button>
							<Button variant="ghost" size="xs" onClick={() => setDraft(null)}>
								Not today
							</Button>
						</div>
					</div>
				) : null}
			</section>
		</div>
	);
}
