import type { FormEvent } from "react";

import { DECIDE_LIMITS } from "../../shared/decide";
import { DecideQuestionEditor } from "../components/DecideQuestionEditor";
import { DecideResults } from "../components/DecideResults";
import { DecideSubjectFields } from "../components/DecideSubjectFields";
import { KeyRequiredNotice } from "../components/KeyRequiredNotice";
import { DECIDE_EXAMPLES } from "../lib/decide-examples";
import { useDecide } from "../lib/use-decide";
import { useStaticPageMetadata } from "../lib/use-document-metadata";

export function DecidePage() {
	const decide = useDecide();
	const { form } = decide;

	useStaticPageMetadata("/labs/decide");

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		decide.submit();
	}

	return (
		<main className="page">
			<h1>Decide</h1>
			<p className="page-lede">
				Give it some text, and an image if you like, then ask up to {DECIDE_LIMITS.maxQuestions}{" "}
				questions. Each answer comes back as a probability, a choice or a level.
			</p>

			<ul aria-label="Examples" className="ask-examples">
				{DECIDE_EXAMPLES.map((example) => (
					<li key={example.id}>
						<button onClick={() => decide.loadExample(example)} type="button">
							{example.label}
						</button>
					</li>
				))}
			</ul>

			<form className="ask-form decide-form" onSubmit={handleSubmit}>
				<DecideSubjectFields
					image={form.image}
					imageError={decide.imageError}
					isReadingImage={decide.isReadingImage}
					onImageChange={(image) => decide.dispatch({ image, type: "image" })}
					onPickImage={(file) => void decide.pickImage(file)}
					onSubjectChange={(subject) => decide.dispatch({ subject, type: "subject" })}
					subject={form.subject}
				/>

				<fieldset className="decide-questions">
					<legend>Questions</legend>
					<ol>
						{form.questions.map((question, index) => (
							<DecideQuestionEditor
								canRemove={form.questions.length > DECIDE_LIMITS.minQuestions}
								dispatch={decide.dispatch}
								key={question.key}
								number={index + 1}
								question={question}
							/>
						))}
					</ol>
					<button
						className="decide-quiet"
						disabled={form.questions.length >= DECIDE_LIMITS.maxQuestions}
						onClick={() => decide.dispatch({ type: "addQuestion" })}
						type="button"
					>
						Add question
					</button>
				</fieldset>

				<KeyRequiredNotice requires="polychat-pro" what="Decide" />
				{decide.problem ? <p className="decide-hint">{decide.problem}</p> : null}
				<button
					disabled={decide.isPending || decide.isReadingImage || Boolean(decide.problem)}
					type="submit"
				>
					{decide.isPending ? "Deciding" : "Decide"}
				</button>
			</form>

			{decide.error ? (
				<p className="ask-error" role="alert">
					{decide.error.message}
				</p>
			) : null}

			{decide.answers && decide.askedRequest ? (
				<DecideResults answers={decide.answers} request={decide.askedRequest} />
			) : null}
		</main>
	);
}
