import { useState } from "react";

import { formatProbabilityPercent } from "../shared/probability";
import { Readout } from "../shared/Readout";
import { LevelTrace } from "./LevelTrace";
import { RecordOrb } from "./RecordOrb";
import { SegmentInspector } from "./SegmentInspector";
import { summariseTranscript } from "./stats";
import { TranscriptView } from "./TranscriptView";
import { transcriptText, useLiveTranscript } from "./useLiveTranscript";

const percentOrDash = (value: number | null) =>
	value === null ? "—" : formatProbabilityPercent(value);

const LEGEND = [
	{ className: "ink-strong", label: "heard" },
	{ className: "ink-middling", label: "unsure" },
	{ className: "ink-weak", label: "doubtful" },
	{ className: "ink-struck", label: "struck" },
];

const EMPTY_WORDS = "Every word you say lands here in ink as firm as the evidence."
	.split(" ")
	.map((text, index) => ({
		id: `${index}-${text}`,
		opacity: Math.max(0.1, 1 - index * 0.08),
		text,
	}));

function EmptyTranscript() {
	return (
		<div className="empty-transcript">
			<p className="transcript">
				{EMPTY_WORDS.map((word) => (
					<span key={word.id} style={{ opacity: word.opacity }}>
						{word.text}{" "}
					</span>
				))}
			</p>
			<p className="muted">
				Press the button and talk normally. Each phrase is transcribed, then Clef Omni listens again
				and weighs every word against the audio. Anything it cannot hear is struck out.
			</p>
		</div>
	);
}

export function VerbatimApp({ contextLength }: { contextLength: number }) {
	const transcript = useLiveTranscript(contextLength);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [copied, setCopied] = useState(false);
	const stats = summariseTranscript(transcript.entries);
	const transcribed = transcript.entries.flatMap((entry) =>
		entry.state === "done" && entry.result.status === "transcribed"
			? [{ id: entry.id, roundTripMs: entry.roundTripMs, segment: entry.result }]
			: [],
	);
	const inspected = transcribed.find((item) => item.id === selectedId) ?? transcribed.at(-1);
	const unchecked = transcript.entries.find((entry) => entry.state === "unchecked");
	const listening = transcript.status === "listening";
	const pending = transcript.entries.filter(
		(entry) => entry.state === "pending" || entry.state === "drafted",
	).length;

	const copy = async () => {
		await navigator.clipboard.writeText(transcriptText(transcript.entries));
		setCopied(true);
		setTimeout(() => setCopied(false), 1600);
	};

	return (
		<main className="view verbatim">
			<header className="view-head">
				<div>
					<p className="eyebrow">Pashi studio</p>
					<h1 className="view-title">Verbatim</h1>
				</div>
			</header>

			<section className="console">
				<div className="console-row">
					<RecordOrb
						level={transcript.level}
						listening={listening}
						onToggle={() => (listening ? transcript.stop() : void transcript.start())}
						starting={transcript.status === "starting"}
					/>
					<div className="console-trace">
						<LevelTrace
							active={listening}
							level={transcript.level}
							markers={transcript.entries.length}
						/>
						<div className="console-status">
							<span className={`status-dot ${listening ? "status-dot-live" : ""}`} />
							{listening ? "Listening" : transcript.status === "starting" ? "Warming up" : "Idle"}
							<span className="status-divider">/</span>
							{pending > 0 ? `${pending} in review` : `${transcribed.length} phrases`}
						</div>
					</div>
				</div>
				<div className="readouts">
					<Readout label="Words" value={String(stats.words)} />
					<Readout label="Mean ink" value={percentOrDash(stats.meanWordProbability)} />
					<Readout label="Verbatim" value={percentOrDash(stats.meanVerbatim)} />
					<Readout label="Fluent" value={percentOrDash(stats.meanFluent)} />
					<Readout label="Struck / phantoms" value={`${stats.struckWords} / ${stats.phantoms}`} />
					<Readout
						label="Settled"
						value={
							stats.meanRoundTripMs === null ? "—" : `${(stats.meanRoundTripMs / 1000).toFixed(1)}s`
						}
					/>
				</div>
			</section>

			{transcript.error ? (
				<p className="alert" role="alert">
					{transcript.error}
				</p>
			) : null}

			{unchecked && unchecked.state === "unchecked" ? (
				<p className="notice">Transcribed but not checked: {unchecked.reason}</p>
			) : null}

			<div className="verbatim-grid">
				<article className="verbatim-transcript">
					<div className="transcript-bar">
						<ul className="legend">
							{LEGEND.map((item) => (
								<li key={item.label}>
									<span className={`ink legend-word ${item.className}`}>word</span>
									{item.label}
								</li>
							))}
						</ul>
						<div className="transcript-actions">
							<button
								type="button"
								className="button"
								disabled={stats.words === 0}
								onClick={() => void copy()}
							>
								{copied ? "Copied" : "Copy"}
							</button>
							<button
								type="button"
								className="button button-loud"
								disabled={transcript.entries.length === 0 || listening}
								onClick={() => {
									setSelectedId(null);
									transcript.clear();
								}}
							>
								Clear
							</button>
						</div>
					</div>
					{transcript.entries.length === 0 ? (
						<EmptyTranscript />
					) : (
						<TranscriptView
							entries={transcript.entries}
							listening={listening}
							onSelect={setSelectedId}
							selectedId={inspected?.id ?? null}
						/>
					)}
				</article>

				<aside className="verbatim-inspector">
					{inspected ? (
						<SegmentInspector roundTripMs={inspected.roundTripMs} segment={inspected.segment} />
					) : (
						<div className="inspector-empty">
							<p className="inspector-empty-title">The inspector</p>
							<p className="muted">
								Pick any phrase to see how sure Clef Omni was, how it sounded, what it struck and
								where the milliseconds went.
							</p>
						</div>
					)}
				</aside>
			</div>
		</main>
	);
}
