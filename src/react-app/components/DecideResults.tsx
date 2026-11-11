import { describeProbability, formatProbabilityPercent } from "../../shared-ui/probability";
import { ProbabilityDial } from "../../shared-ui/ProbabilityDial";
import { StepScale } from "../../shared-ui/StepScale";
import type { DecideAnswer, DecideQuestion, DecideRequest } from "../../shared/decide";

interface DecideResultsProps {
	answers: readonly DecideAnswer[];
	request: DecideRequest;
}

function AnswerBody({ answer, question }: { answer: DecideAnswer; question: DecideQuestion }) {
	if (answer.type === "yesno") {
		return (
			<div className="decide-answer-body">
				<ProbabilityDial label="Yes" probability={answer.probability} />
				<p>{describeProbability(answer.probability)}</p>
			</div>
		);
	}

	if (answer.type === "choice" && question.type === "choice") {
		const chosen = question.options.find((option) => option.id === answer.choice);

		return (
			<div className="decide-answer-body">
				<ProbabilityDial label={chosen?.label ?? answer.choice} probability={answer.confidence} />
				<ol className="decide-distribution">
					{question.options.map((option) => {
						const share = answer.distribution[option.id] ?? 0;

						return (
							<li data-chosen={option.id === answer.choice} key={option.id}>
								<span className="decide-distribution-label">{option.label}</span>
								<span aria-hidden="true" className="decide-distribution-bar">
									<span style={{ width: formatProbabilityPercent(share) }} />
								</span>
								<span className="decide-distribution-value">{formatProbabilityPercent(share)}</span>
							</li>
						);
					})}
				</ol>
			</div>
		);
	}

	if (answer.type === "score" && question.type === "score") {
		return (
			<div className="decide-answer-body">
				<StepScale active={answer.levelIndex} label="Level" steps={question.levels} />
			</div>
		);
	}

	return null;
}

export function DecideResults({ answers, request }: DecideResultsProps) {
	return (
		<section aria-live="polite" className="decide-results">
			<h2>Answers</h2>
			<ol>
				{answers.map((answer) => {
					const question = request.questions.find((entry) => entry.id === answer.id);

					return question ? (
						<li className="decide-answer" key={answer.id}>
							<h3>{question.prompt}</h3>
							<AnswerBody answer={answer} question={question} />
						</li>
					) : null;
				})}
			</ol>
		</section>
	);
}
