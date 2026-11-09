import { useState } from "react";

import { Button } from "./Button";
import {
	POLIS_PLAYBACK_UNITS,
	type PolisPlaybackState,
	type PolisPlaybackUnit,
	type PolisStatus,
} from "./engine/protocol";
import { formatMoment } from "./format";
import type { PolisEngine } from "./usePolisEngine";

const UNIT_LABELS: Record<PolisPlaybackUnit, string> = {
	hours: "Hours",
	days: "Days",
	months: "Months",
	years: "Years",
};

function Timeline({
	engine,
	status,
	playback,
}: {
	engine: PolisEngine;
	status: PolisStatus;
	playback: PolisPlaybackState;
}) {
	const [draft, setDraft] = useState<number | null>(null);
	const end = Math.max(playback.endDay, 1);
	const value = draft ?? playback.day;

	const commit = () => {
		if (draft !== null) {
			engine.send({ type: "seek", day: draft, hour: playback.hour });
			setDraft(null);
		}
	};

	return (
		<div className="polis-timeline">
			<div className="polis-marks">
				{status.marks.map((mark, index) => (
					<button
						key={`${mark.day}-${index}`}
						type="button"
						title={`${formatMoment(mark.day)}: ${mark.label}`}
						aria-label={`Jump to ${mark.label}`}
						onClick={() => engine.send({ type: "seek", day: mark.day })}
						style={{ left: `${(mark.day / end) * 100}%` }}
						className={`polis-mark polis-mark-${mark.kind}`}
					/>
				))}
			</div>
			<input
				type="range"
				min={0}
				max={end}
				step={1}
				value={value}
				aria-label="Timeline"
				onChange={(event) => setDraft(Number(event.target.value))}
				onPointerUp={commit}
				onKeyUp={commit}
				className="polis-range"
			/>
		</div>
	);
}

export function PlaybackBar({
	engine,
	status,
	playback,
}: {
	engine: PolisEngine;
	status: PolisStatus;
	playback: PolisPlaybackState;
}) {
	const { send } = engine;
	const { unit } = playback;

	return (
		<div className="polis-playback">
			<div className="polis-playback-row">
				<Timeline engine={engine} status={status} playback={playback} />
				<span className="polis-playback-time">
					{playback.seeking ? "Rewinding…" : formatMoment(playback.day, playback.hour)}
				</span>
			</div>
			<div className="polis-playback-row polis-playback-controls">
				<Button
					variant="primary"
					size="icon"
					icon={playback.playing ? "pause" : "play"}
					aria-label={playback.playing ? "Pause playback" : "Play back"}
					onClick={() => send({ type: "playback", playing: !playback.playing, unit })}
				/>
				<Button
					variant="ghost"
					size="icon"
					icon="chevronLeft"
					aria-label={`Back one ${unit.slice(0, -1)}`}
					onClick={() => send({ type: "nudge", unit, direction: -1 })}
				/>
				<Button
					variant="ghost"
					size="icon"
					icon="chevronRight"
					aria-label={`Forward one ${unit.slice(0, -1)}`}
					onClick={() => send({ type: "nudge", unit, direction: 1 })}
				/>
				<div role="group" aria-label="Playback steps" className="polis-segments">
					{POLIS_PLAYBACK_UNITS.map((option) => (
						<button
							key={option}
							type="button"
							aria-pressed={unit === option}
							className="polis-segment"
							onClick={() => send({ type: "playback", playing: playback.playing, unit: option })}
						>
							{UNIT_LABELS[option]}
						</button>
					))}
				</div>
				{engine.viewOnly ? null : (
					<div className="polis-playback-exit">
						<Button
							variant="outline"
							size="xs"
							icon="cornerDownRight"
							disabled={playback.seeking}
							onClick={() => send({ type: "carryOn" })}
						>
							Carry on from here
						</Button>
						<Button
							variant="secondary"
							size="xs"
							icon="radio"
							onClick={() => send({ type: "backToNow" })}
						>
							Back to now
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
