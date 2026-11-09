import { useState } from "react";

import {
	POLIS_PARAMETER_IDS,
	POLIS_PARAMETERS,
	type PolisParameterId,
} from "../../../shared/polis";
import { Button } from "../Button";
import type { PolisStatus } from "../engine/protocol";
import { formatParameter } from "../library/index";
import type { PolisEngine } from "../usePolisEngine";
import { LawEffects } from "./LawEffects";
import { Proposal } from "./Proposal";

const GROUPS = ["Tax", "Welfare", "Housing", "Work", "Society"] as const;

function ParameterSlider({
	id,
	engine,
	status,
}: {
	id: PolisParameterId;
	engine: PolisEngine;
	status: PolisStatus;
}) {
	const definition = POLIS_PARAMETERS[id];
	const committed = status.snapshot.parameters[id];
	const [draft, setDraft] = useState<number | null>(null);
	const value = draft ?? committed;
	const overridden = status.snapshot.laws.some((law) =>
		law.changes.some((change) => change.parameter === id),
	);

	const commit = () => {
		if (draft !== null) {
			engine.send({ type: "parameters", values: { [id]: draft } });
			setDraft(null);
		}
	};

	return (
		<label className="polis-slider">
			<span className="polis-slider-head">
				<span>{definition.label}</span>
				<span className="polis-mono">{formatParameter(id, value)}</span>
			</span>
			<input
				type="range"
				min={definition.min}
				max={definition.max}
				step={definition.step}
				value={value}
				disabled={overridden}
				title={overridden ? "Set by a law. Repeal it to change this." : definition.hint}
				aria-label={definition.label}
				onChange={(event) => setDraft(Number(event.target.value))}
				onPointerUp={commit}
				onKeyUp={commit}
				onBlur={commit}
				className="polis-range"
			/>
		</label>
	);
}

export function LawsPanel({ engine, status }: { engine: PolisEngine; status: PolisStatus }) {
	return (
		<div className="polis-stack polis-stack-wide">
			<Proposal engine={engine} status={status} />

			{status.snapshot.laws.length > 0 ? (
				<section className="polis-stack">
					<h3 className="polis-heading">On the books</h3>
					<ul className="polis-list polis-list-spaced">
						{status.snapshot.laws.map((law) => (
							<li key={law.id} className="polis-law">
								<div className="polis-row">
									<p className="polis-small-strong">{law.title}</p>
									<Button
										variant="ghost"
										size="xs"
										icon="x"
										onClick={() => engine.send({ type: "repeal", id: law.id })}
									>
										Repeal
									</Button>
								</div>
								<LawEffects law={law} />
							</li>
						))}
					</ul>
				</section>
			) : null}

			{GROUPS.map((group) => (
				<section key={group} className="polis-stack">
					<h3 className="polis-heading">{group}</h3>
					{POLIS_PARAMETER_IDS.filter((id) => POLIS_PARAMETERS[id].group === group).map((id) => (
						<ParameterSlider key={id} id={id} engine={engine} status={status} />
					))}
				</section>
			))}
		</div>
	);
}
