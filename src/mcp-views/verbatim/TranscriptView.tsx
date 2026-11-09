import type { CSSProperties } from "react";

import {
	describeProbability,
	formatProbabilityPercent,
	probabilityTone,
} from "../shared/probability";
import type { VerbatimWord } from "./types";
import type { TranscriptEntry } from "./useLiveTranscript";
import { keyedWords } from "./words";

const WORD_STAGGER_MS = 12;

function inkStyle(probability: number, index: number): CSSProperties {
	return { animationDelay: `${index * WORD_STAGGER_MS}ms`, opacity: 0.28 + probability * 0.72 };
}

function Word({ index, word }: { index: number; word: VerbatimWord }) {
	if (word.removed) {
		return (
			<span
				className="ink ink-struck"
				style={{ animationDelay: `${index * WORD_STAGGER_MS}ms` }}
				title="Struck out: Clef Omni could not hear this in the audio"
			>
				{word.text}
			</span>
		);
	}

	if (word.probability === null) {
		return <span className="ink">{word.text}</span>;
	}

	const tone = probabilityTone(word.probability);

	return (
		<span
			className={`ink ink-${tone}`}
			style={inkStyle(word.probability, index)}
			title={`${formatProbabilityPercent(word.probability)} heard · ${describeProbability(word.probability).toLowerCase()}`}
		>
			{word.text}
		</span>
	);
}

export function TranscriptView({
	entries,
	listening,
	onSelect,
	selectedId,
}: {
	entries: readonly TranscriptEntry[];
	listening: boolean;
	onSelect: (id: number) => void;
	selectedId: number | null;
}) {
	return (
		<p className="transcript" aria-live="polite">
			{entries.map((entry) => {
				if (entry.state === "pending") {
					return (
						<span key={entry.id} className="wet-ink">
							…{" "}
						</span>
					);
				}

				if (entry.state === "drafted") {
					return (
						<span
							key={entry.id}
							className="wet-ink"
							title="Wet ink: transcribed, still being checked against the audio"
						>
							{entry.draft}{" "}
						</span>
					);
				}

				if (entry.state === "unchecked") {
					return (
						<span key={entry.id} className="unchecked-ink" title={`Not checked: ${entry.reason}`}>
							{entry.draft}{" "}
						</span>
					);
				}

				if (entry.state === "failed") {
					return (
						<span key={entry.id} className="transcript-note transcript-failure" title={entry.error}>
							[missed a phrase]{" "}
						</span>
					);
				}

				const { result } = entry;

				if (result.status === "silence") {
					return null;
				}

				if (result.status === "no_speech") {
					return (
						<span
							key={entry.id}
							className="transcript-note"
							title={`The transcriber heard “${result.rawText}”, but Clef Omni put speech at ${formatProbabilityPercent(result.speech)}`}
						>
							[phantom “{result.rawText}” ignored]{" "}
						</span>
					);
				}

				return (
					<button
						key={entry.id}
						type="button"
						className={`phrase ${selectedId === entry.id ? "phrase-selected" : ""}`}
						onClick={() => onSelect(entry.id)}
					>
						{keyedWords(result.words).map(({ key, position, word }) => (
							<span key={key}>
								<Word index={position} word={word} />{" "}
							</span>
						))}
					</button>
				);
			})}
			{listening ? <span className="caret" aria-hidden="true" /> : null}
		</p>
	);
}
