import { useNavigate } from "react-router-dom";

import { askToolUrl, readAskOutput, type AskAnswer as Answer } from "../lib/ask-api";

export function AskAnswer({ answer }: { answer: Answer }) {
	const navigate = useNavigate();
	const output = readAskOutput(answer);

	return (
		<section className="ask-result" aria-live="polite">
			<h2>{answer.toolLabel}</h2>
			<p>{answer.reason}</p>
			{output?.kind === "fields" ? (
				<dl className="ask-fields ask-output">
					{output.entries.map(([key, value]) => (
						<div key={key}>
							<dt>{key}</dt>
							<dd>{value}</dd>
						</div>
					))}
				</dl>
			) : null}
			{output?.kind === "text" ? <pre className="ask-output">{output.text}</pre> : null}
			<p>
				{output
					? "Ran with these values. Open the tool to change them and run it again."
					: "Open the tool to run it with these values."}
			</p>
			<dl className="ask-fields">
				{answer.input ? (
					<div>
						<dt>input</dt>
						<dd>{answer.input}</dd>
					</div>
				) : null}
				{Object.entries(answer.fields).map(([key, value]) => (
					<div key={key}>
						<dt>{key}</dt>
						<dd>{value}</dd>
					</div>
				))}
			</dl>
			<button onClick={() => void navigate(askToolUrl(answer))} type="button">
				Open {answer.toolLabel}
			</button>
		</section>
	);
}
