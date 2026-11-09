import { useState } from "react";

import { Button } from "./Button";
import { POLIS_MAP_MODES, POLIS_SPEEDS, type PolisMapMode } from "./engine/protocol";
import { formatMoment } from "./format";
import { ShareControl } from "./ShareControl";
import type { PolisEngine } from "./usePolisEngine";

const MAP_MODE_LABELS: Record<PolisMapMode, string> = {
	town: "Town",
	mood: "Mood",
	wealth: "Wealth",
	rent: "Rent",
};

export function NamePlate({ engine }: { engine: PolisEngine }) {
	const snapshot = engine.status?.snapshot;
	const playback = engine.status?.playback;

	if (!snapshot) {
		return null;
	}

	return (
		<div className="polis-nameplate">
			<p className="polis-nameplate-name">{snapshot.name}</p>
			<p className="polis-nameplate-time">
				{playback
					? formatMoment(playback.day, playback.hour)
					: formatMoment(snapshot.day, engine.status?.hour)}
			</p>
		</div>
	);
}

export function MapModes({ engine }: { engine: PolisEngine }) {
	const [mode, setMode] = useState<PolisMapMode>("town");

	return (
		<div role="group" aria-label="Map view" className="polis-modes">
			{POLIS_MAP_MODES.map((option) => (
				<button
					key={option}
					type="button"
					aria-pressed={mode === option}
					className="polis-segment"
					onClick={() => {
						setMode(option);
						engine.send({ type: "mapMode", mode: option });
					}}
				>
					{MAP_MODE_LABELS[option]}
				</button>
			))}
		</div>
	);
}

export function Transport({ engine }: { engine: PolisEngine }) {
	const { status, send } = engine;

	if (!status) {
		return null;
	}

	return (
		<div className="polis-transport">
			<Button
				variant={status.running ? "secondary" : "primary"}
				size="icon"
				icon={status.running ? "pause" : "play"}
				aria-label={status.running ? "Pause" : "Play"}
				onClick={() => send({ type: "running", running: !status.running })}
			/>
			<Button
				variant="ghost"
				size="icon"
				icon="skip"
				aria-label="Skip a month"
				title="Skip a month"
				onClick={() => send({ type: "step", days: 30 })}
			/>
			<div role="group" aria-label="Speed" className="polis-segments">
				{POLIS_SPEEDS.map((speed, index) => (
					<button
						key={speed.label}
						type="button"
						aria-pressed={status.speedIndex === index}
						className="polis-segment"
						onClick={() => send({ type: "speed", index })}
					>
						{speed.label}
					</button>
				))}
			</div>
			<Button
				variant="ghost"
				size="icon"
				icon="save"
				aria-label="Save the town"
				title="Save the town"
				onClick={() => send({ type: "export", purpose: "save" })}
			/>
			<Button
				variant="ghost"
				size="icon"
				icon="download"
				aria-label="Download the recording"
				title="Download the recording"
				onClick={() => send({ type: "export", purpose: "download" })}
			/>
			<ShareControl engine={engine} />
			<Button variant="outline" size="sm" icon="history" onClick={() => send({ type: "watch" })}>
				Rewind
			</Button>
		</div>
	);
}
