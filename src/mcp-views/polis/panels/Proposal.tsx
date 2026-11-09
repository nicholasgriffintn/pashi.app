import { useState, type FormEvent } from "react";

import { POLIS_DRAFT_LENGTH, type PolisLaw } from "../../../shared/polis";
import { errorMessage } from "../../shared/errors";
import { formatProbabilityPercent } from "../../shared/probability";
import { Button } from "../Button";
import type { PolisStatus } from "../engine/protocol";
import { polisService } from "../service";
import type { PolisEngine } from "../usePolisEngine";
import { LawEffects } from "./LawEffects";

const EXAMPLES = [
	"Cap rents at 2% a year",
	"Tax the rich 3% of their wealth each year",
	"Pay every pensioner an extra £300 a month",
	"Ban buy-to-let landlords",
	"Raise the retirement age to 72",
];

function PollResults({ engine }: { engine: PolisEngine }) {
	const { poll } = engine;

	if (poll.status === "idle") {
		return null;
	}

	if (poll.status === "asking") {
		return <p className="polis-small">Knocking on doors…</p>;
	}

	if (poll.status === "failed") {
		return <p className="polis-error">{poll.message}</p>;
	}

	const { result } = poll;

	return (
		<div className="polis-poll">
			<p className="polis-small-strong">
				{formatProbabilityPercent(result.support)} would vote for it
			</p>
			{result.groups.map((group) => (
				<div key={group.label} className="polis-bar-row polis-bar-row-groups">
					<span className="polis-faint">{group.label}</span>
					<span className="polis-bar">
						<span className="polis-bar-fill" style={{ width: `${group.support * 100}%` }} />
					</span>
					<span className="polis-mono polis-right">{formatProbabilityPercent(group.support)}</span>
				</div>
			))}
		</div>
	);
}

export function Proposal({ engine, status }: { engine: PolisEngine; status: PolisStatus }) {
	const [text, setText] = useState("");
	const [busy, setBusy] = useState(false);
	const [law, setLaw] = useState<PolisLaw | null>(null);
	const [refusal, setRefusal] = useState<string | null>(null);

	const draft = async (proposal: string) => {
		setBusy(true);
		setRefusal(null);
		setLaw(null);
		engine.clearPoll();

		try {
			const result = await polisService.draftLaw({
				text: proposal,
				parameters: status.snapshot.parameters,
			});

			if (result.status === "enforceable") {
				setLaw(result.law);
			} else {
				setRefusal(result.reason);
			}
		} catch (caught) {
			setRefusal(errorMessage(caught, "The clerk could not draft that"));
		} finally {
			setBusy(false);
		}
	};

	const submit = (event: FormEvent) => {
		event.preventDefault();

		if (text.trim().length >= POLIS_DRAFT_LENGTH.min) {
			void draft(text.trim());
		}
	};

	const reset = () => {
		setLaw(null);
		setText("");
		engine.clearPoll();
	};

	return (
		<section className="polis-stack">
			<h3 className="polis-heading">Propose a law</h3>
			<form onSubmit={submit} className="polis-stack">
				<textarea
					value={text}
					onChange={(event) => setText(event.target.value)}
					maxLength={POLIS_DRAFT_LENGTH.max}
					rows={2}
					placeholder="Write it however you like"
					aria-label="Your proposal"
				/>
				<div>
					<Button
						type="submit"
						variant="primary"
						size="sm"
						icon="scale"
						isLoading={busy}
						disabled={text.trim().length < POLIS_DRAFT_LENGTH.min}
					>
						Draft it
					</Button>
				</div>
			</form>
			{!law && !busy ? (
				<div className="polis-chips">
					{EXAMPLES.map((example) => (
						<button
							key={example}
							type="button"
							className="polis-chip"
							onClick={() => {
								setText(example);
								void draft(example);
							}}
						>
							{example}
						</button>
					))}
				</div>
			) : null}
			{refusal ? <p className="polis-error">{refusal}</p> : null}
			{law ? (
				<div className="polis-draft">
					<p className="polis-card-title">{law.title}</p>
					<p className="polis-small-text">{law.summary}</p>
					<LawEffects law={law} />
					<PollResults engine={engine} />
					<div className="polis-inline">
						<Button
							variant="primary"
							size="xs"
							icon="gavel"
							onClick={() => {
								engine.send({ type: "law", law });
								reset();
							}}
						>
							Enact
						</Button>
						<Button
							variant="outline"
							size="xs"
							icon="vote"
							disabled={engine.poll.status === "asking"}
							onClick={() => engine.askTown(`${law.title}: ${law.summary}`)}
						>
							Poll the town
						</Button>
						<Button variant="ghost" size="xs" onClick={reset}>
							Bin it
						</Button>
					</div>
				</div>
			) : null}
		</section>
	);
}
