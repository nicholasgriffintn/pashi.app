import { useState, type FormEvent } from "react";

import { formatCompactCount } from "../shared/numbers";
import { Button } from "./Button";
import { Icon } from "./icons";
import { seedFromText } from "./library/index";
import { OpeningCard } from "./OpeningCard";
import { PastTowns } from "./PastTowns";
import type { PolisEngine } from "./usePolisEngine";

const POPULATIONS = [1000, 5000, 10000, 25000, 50000];

function randomSeed() {
	return Math.floor(Math.random() * 1_000_000).toString();
}

export function SetupScreen({ engine }: { engine: PolisEngine }) {
	const [population, setPopulation] = useState(10000);
	const [name, setName] = useState("");
	const [seed, setSeed] = useState(randomSeed);

	const found = (event: FormEvent) => {
		event.preventDefault();

		engine.send({
			type: "create",
			population,
			seed: seedFromText(seed),
			name: name.trim() || undefined,
		});
		engine.send({ type: "running", running: true });
	};

	if (engine.restoring) {
		return (
			<OpeningCard
				title={`Rebuilding ${engine.restoring.name}`}
				progress={engine.restoring.progress}
			/>
		);
	}

	return (
		<div className="polis-cover polis-cover-scroll">
			<form onSubmit={found} className="polis-card polis-setup">
				<div className="polis-stack">
					<p className="polis-card-title polis-card-title-large">Found a town</p>
					<p className="muted">
						Everyone in it gets a job, a home, a family and something they want from life. Then you
						change the rules and see who cheers.
					</p>
				</div>

				<fieldset className="polis-fieldset">
					<legend className="field-label">People</legend>
					<div className="polis-populations">
						{POPULATIONS.map((option) => (
							<button
								key={option}
								type="button"
								aria-pressed={population === option}
								className="polis-segment polis-segment-boxed"
								onClick={() => setPopulation(option)}
							>
								{formatCompactCount(option)}
							</button>
						))}
					</div>
				</fieldset>

				<label className="field">
					<span className="field-label">Name</span>
					<input
						value={name}
						onChange={(event) => setName(event.target.value)}
						maxLength={40}
						placeholder="Leave blank to let the map decide"
					/>
				</label>

				<label className="field">
					<span className="field-label">Seed</span>
					<span className="polis-inline">
						<input
							value={seed}
							onChange={(event) => setSeed(event.target.value)}
							maxLength={24}
							className="polis-mono-input"
						/>
						<Button
							variant="outline"
							size="icon"
							icon="dice"
							aria-label="New seed"
							onClick={() => setSeed(randomSeed())}
						/>
					</span>
					<span className="field-hint">The same seed founds the same town.</span>
				</label>

				<Button type="submit" variant="primary" disabled={!engine.ready}>
					<Icon name="landmark" size={16} />
					Found it
				</Button>

				<PastTowns engine={engine} />
			</form>
		</div>
	);
}
