import { DECIDE_LIMITS } from "../../shared/decide";
import {
	entryLimits,
	type DecideDraftQuestion,
	type DecideEntryList as EntryList,
	type DecideFormAction,
} from "../lib/decide-form";

interface DecideEntryListProps {
	dispatch: (action: DecideFormAction) => void;
	list: EntryList;
	question: DecideDraftQuestion;
	questionNumber: number;
}

const COPY: Record<EntryList, { add: string; heading: string; noun: string }> = {
	levels: { add: "Add level", heading: "Levels, lowest first", noun: "Level" },
	options: { add: "Add option", heading: "Options", noun: "Option" },
};

export function DecideEntryList({
	dispatch,
	list,
	question,
	questionNumber,
}: DecideEntryListProps) {
	const entries = question[list];
	const limits = entryLimits(list);
	const copy = COPY[list];

	return (
		<div className="decide-entries">
			<span className="decide-entries-heading">{copy.heading}</span>
			<ol>
				{entries.map((entry, index) => {
					const name = `${copy.noun} ${index + 1} for question ${questionNumber}`;

					return (
						<li key={entry.key}>
							<input
								aria-label={name}
								maxLength={DECIDE_LIMITS.labelLength}
								onChange={(event) =>
									dispatch({
										entry: entry.key,
										label: event.target.value,
										list,
										question: question.key,
										type: "entry",
									})
								}
								type="text"
								value={entry.label}
							/>
							<button
								aria-label={`Remove ${name.toLowerCase()}`}
								className="decide-quiet"
								disabled={entries.length <= limits.min}
								onClick={() =>
									dispatch({ entry: entry.key, list, question: question.key, type: "removeEntry" })
								}
								type="button"
							>
								<span aria-hidden="true">×</span>
							</button>
						</li>
					);
				})}
			</ol>
			<button
				className="decide-quiet"
				disabled={entries.length >= limits.max}
				onClick={() => dispatch({ list, question: question.key, type: "addEntry" })}
				type="button"
			>
				{copy.add}
			</button>
		</div>
	);
}
