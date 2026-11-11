import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { AskAnswer } from "../components/AskAnswer";
import { KeyRequiredNotice } from "../components/KeyRequiredNotice";
import { askPashi } from "../lib/ask-api";
import { useDocumentMetadata } from "../lib/use-document-metadata";

const EXAMPLES = [
	"five uppercase v7 uuids",
	"a strong 24 character password with symbols",
	"turn this markdown into jira markup",
	"what are the odds of rolling 15 or more on 3d6",
];

export function AskPage() {
	const [request, setRequest] = useState("");

	useDocumentMetadata(
		"Ask Pashi",
		"Describe what you need and Pashi picks the tool, runs it when it is simple and otherwise opens it with the form filled in.",
	);

	const { data, error, isPending, mutate } = useMutation({ mutationFn: askPashi });

	function handleSubmit(event: FormEvent) {
		event.preventDefault();

		if (request.trim()) {
			mutate(request.trim());
		}
	}

	return (
		<main className="page">
			<h1>Ask Pashi</h1>
			<p className="page-lede">
				Describe what you need. Pashi picks the tool and runs it when it is simple; otherwise it
				fills the form for you to run.
			</p>

			<form className="ask-form" onSubmit={handleSubmit}>
				<label htmlFor="ask-request">What do you need?</label>
				<textarea
					id="ask-request"
					onChange={(event) => setRequest(event.target.value)}
					placeholder="five uppercase v7 uuids"
					rows={3}
					value={request}
				/>
				<KeyRequiredNotice requires="polychat" what="Ask Pashi" />
				<button disabled={isPending || !request.trim()} type="submit">
					{isPending ? "Thinking" : "Ask"}
				</button>
			</form>

			<ul className="ask-examples">
				{EXAMPLES.map((example) => (
					<li key={example}>
						<button onClick={() => setRequest(example)} type="button">
							{example}
						</button>
					</li>
				))}
			</ul>

			{error ? (
				<p className="ask-error" role="alert">
					{error.message}
				</p>
			) : null}

			{data ? <AskAnswer answer={data} /> : null}
		</main>
	);
}
