import type { ReactNode } from "react";

import { formatProbabilityPercent } from "../../shared-ui/probability";
import { ProbabilityDial } from "../../shared-ui/ProbabilityDial";
import { StepScale } from "../../shared-ui/StepScale";
import type { TranscribedSegment } from "./types";
import { keyedWords } from "./words";

function Section({ children, title }: { children: ReactNode; title: string }) {
	return (
		<section className="inspector-section">
			<h3 className="inspector-title">{title}</h3>
			{children}
		</section>
	);
}

function TimingStack({
	roundTripMs,
	segment,
}: {
	roundTripMs: number;
	segment: TranscribedSegment;
}) {
	const { decideMs, repairMs, transcribeMs } = segment.timings;
	const network = Math.max(0, roundTripMs - transcribeMs - decideMs - repairMs);
	const parts = [
		{ className: "timing-transcribe", label: "Transcribe", ms: transcribeMs },
		{ className: "timing-judge", label: "Judge", ms: decideMs },
		{ className: "timing-repair", label: "Repair", ms: repairMs },
		{ className: "timing-network", label: "Network", ms: network },
	].filter((part) => part.ms > 0);
	const total = parts.reduce((sum, part) => sum + part.ms, 0) || 1;

	return (
		<div className="timing">
			<div className="timing-bar">
				{parts.map((part) => (
					<span
						key={part.label}
						className={part.className}
						style={{ width: `${(part.ms / total) * 100}%` }}
					/>
				))}
			</div>
			<dl className="timing-legend">
				{parts.map((part) => (
					<div key={part.label}>
						<dt>
							<span className={`timing-swatch ${part.className}`} />
							{part.label}
						</dt>
						<dd>{Math.round(part.ms)}ms</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

function RepairDiff({ segment }: { segment: TranscribedSegment }) {
	const { repair } = segment;

	if (!repair) {
		return <p className="muted">Every word cleared the bar. Nothing to strike.</p>;
	}

	return (
		<div className="repair">
			<p>
				{keyedWords(segment.words).map(({ key, word }) => (
					<span key={key} className={word.removed ? "ink-struck" : ""}>
						{word.text}{" "}
					</span>
				))}
			</p>
			<div className="repair-scores">
				<span>as heard {formatProbabilityPercent(repair.keptProbability)}</span>
				<span className={repair.applied ? "repair-struck" : "repair-kept"}>
					{repair.applied ? "struck" : "kept"} · best {formatProbabilityPercent(repair.probability)}
				</span>
			</div>
		</div>
	);
}

export function SegmentInspector({
	roundTripMs,
	segment,
}: {
	roundTripMs: number;
	segment: TranscribedSegment;
}) {
	const { checks, delivery } = segment;

	return (
		<div className="inspector">
			<Section title="Against the audio">
				<div className="inspector-dials">
					<ProbabilityDial label="Speech" probability={checks.speech} size="sm" />
					<ProbabilityDial label="Word for word" probability={checks.verbatim} size="sm" />
					<ProbabilityDial label="Fluent English" probability={checks.fluent} size="sm" />
					<ProbabilityDial label="Follows on" probability={checks.coherent} size="sm" />
				</div>
			</Section>
			<Section title="Delivery">
				<StepScale
					active={delivery.pace.scale.indexOf(delivery.pace.label)}
					label="Pace"
					steps={delivery.pace.scale}
				/>
				<StepScale
					active={delivery.noise.scale.indexOf(delivery.noise.label)}
					label="Background"
					steps={delivery.noise.scale}
				/>
				<div className="tone">
					<span className="muted">Tone</span>
					<span>
						<span className="tone-label">{delivery.tone.label}</span>{" "}
						<span className="tone-score">{formatProbabilityPercent(delivery.tone.score)}</span>
					</span>
				</div>
			</Section>
			<Section title="Strike-outs">
				<RepairDiff segment={segment} />
			</Section>
			<Section title="Where the time went">
				<TimingStack roundTripMs={roundTripMs} segment={segment} />
				<p className="inspector-footnote">
					{segment.usage.input_tokens.toLocaleString()} tokens · {segment.model}
				</p>
			</Section>
		</div>
	);
}
