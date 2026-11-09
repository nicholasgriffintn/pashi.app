import { useState, type ChangeEvent } from "react";

import { errorMessage } from "../shared/errors";
import { formatCompactCount } from "../shared/numbers";
import { Button } from "./Button";
import { yearOf } from "./format";
import { Icon } from "./icons";
import { readRecording } from "./recording-file";
import type { PolisEngine } from "./usePolisEngine";

export function PastTowns({ engine }: { engine: PolisEngine }) {
	const [error, setError] = useState<string | null>(null);

	const openFile = async (event: ChangeEvent<HTMLInputElement>) => {
		const input = event.target;
		const file = input.files?.[0];

		setError(null);

		if (!file) {
			return;
		}

		try {
			engine.send({ type: "import", recording: await readRecording(file), watch: true });
		} catch (caught) {
			setError(errorMessage(caught, "That file could not be read"));
		}

		input.value = "";
	};

	return (
		<section className="polis-past">
			<div className="polis-row">
				<h3 className="polis-heading">Past towns</h3>
				<label className="polis-file">
					<Icon name="fileUp" size={12} />
					<span>Open a recording</span>
					<input
						type="file"
						accept=".json,application/json"
						className="sr-only"
						onChange={(event) => void openFile(event)}
					/>
				</label>
			</div>
			{error ? <p className="polis-error">{error}</p> : null}
			{engine.townsError ? <p className="polis-error">{engine.townsError}</p> : null}
			{engine.towns.length === 0 ? (
				<p className="polis-small">
					Every town is recorded as it runs, so you can come back and watch it later.
				</p>
			) : (
				<ul className="polis-towns">
					{engine.towns.map((town) => (
						<li key={town.id} className="polis-town">
							<span className="polis-town-text">
								<span className="polis-town-name">{town.name}</span>
								<span className="polis-mono">
									{yearOf(town.day)} years · {formatCompactCount(town.population)} people
								</span>
							</span>
							<Button
								variant="outline"
								size="xs"
								icon="film"
								onClick={() => void engine.openTown(town.id, true)}
							>
								Watch
							</Button>
							<Button
								variant="ghost"
								size="xs"
								icon="play"
								onClick={() => void engine.openTown(town.id, false)}
							>
								Carry on
							</Button>
							<Button
								variant="ghost"
								size="icon"
								icon="trash"
								aria-label={`Delete ${town.name}`}
								onClick={() => void engine.forgetTown(town.id)}
							/>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
