import { DECIDE_LIMITS, type DecideQuestionType } from "../../shared/decide";
import type { DecideDraftQuestion, DecideFormAction } from "../lib/decide-form";
import { DecideEntryList } from "./DecideEntryList";

interface DecideQuestionEditorProps {
	canRemove: boolean;
	dispatch: (action: DecideFormAction) => void;
	number: number;
	question: DecideDraftQuestion;
}

const QUESTION_TYPES: { label: string; type: DecideQuestionType }[] = [
	{ label: "Yes or no", type: "yesno" },
	{ label: "Choice", type: "choice" },
	{ label: "Score", type: "score" },
];

export function DecideQuestionEditor({
	canRemove,
	dispatch,
	number,
	question,
}: DecideQuestionEditorProps) {
	const promptId = `decide-prompt-${question.key}`;
	const typeId = `decide-type-${question.key}`;

	return (
		<li className="decide-question">
			<div className="decide-question-head">
				<span>Question {number}</span>
				<button
					className="decide-quiet"
					disabled={!canRemove}
					onClick={() => dispatch({ question: question.key, type: "removeQuestion" })}
					type="button"
				>
					Remove
				</button>
			</div>
			<label htmlFor={promptId}>Prompt</label>
			<input
				id={promptId}
				maxLength={DECIDE_LIMITS.promptLength}
				onChange={(event) =>
					dispatch({ prompt: event.target.value, question: question.key, type: "prompt" })
				}
				type="text"
				value={question.prompt}
			/>
			<label htmlFor={typeId}>Answer type</label>
			<select
				id={typeId}
				onChange={(event) => {
					const picked = QUESTION_TYPES.find((entry) => entry.type === event.target.value);

					if (picked) {
						dispatch({ question: question.key, questionType: picked.type, type: "questionType" });
					}
				}}
				value={question.type}
			>
				{QUESTION_TYPES.map((entry) => (
					<option key={entry.type} value={entry.type}>
						{entry.label}
					</option>
				))}
			</select>
			{question.type === "choice" ? (
				<DecideEntryList
					dispatch={dispatch}
					list="options"
					question={question}
					questionNumber={number}
				/>
			) : null}
			{question.type === "score" ? (
				<DecideEntryList
					dispatch={dispatch}
					list="levels"
					question={question}
					questionNumber={number}
				/>
			) : null}
		</li>
	);
}
