import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { AskAnswer } from "../components/AskAnswer";
import { KeyRequiredNotice } from "../components/KeyRequiredNotice";
import { askPashi } from "../lib/ask-api";
import { ASK_EXAMPLES } from "../lib/labs-examples";
import { useDocumentMetadata } from "../lib/use-document-metadata";

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
				{ASK_EXAMPLES.map((example) => (
					<li key={example.label}>
						<button onClick={() => setRequest(example.request)} type="button">
							{example.label}
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
