import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { KeyRequiredNotice } from "../components/KeyRequiredNotice";
import { fetchJson } from "../lib/query-client";
import { useDocumentMetadata } from "../lib/use-document-metadata";

type Subject = "cron" | "curl" | "jwt" | "regex" | "sql";

interface Explanation {
	parts: { detail: string; piece: string }[];
	summary: string;
	warnings: string[];
}

const SUBJECTS: { id: Subject; label: string; placeholder: string }[] = [
	{ id: "regex", label: "Regex", placeholder: "^\\+?[1-9]\\d{1,14}$" },
	{ id: "cron", label: "Cron", placeholder: "*/15 9-17 * * 1-5" },
	{ id: "jwt", label: "JWT", placeholder: "Paste the three dot separated segments" },
	{
		id: "curl",
		label: "curl",
		placeholder: "curl -X POST -H 'Accept: application/json' https://api.example.com/v1/things",
	},
	{
		id: "sql",
		label: "SQL",
		placeholder: "delete from sessions where last_seen < now() - interval '30 days'",
	},
];

export function ExplainPage() {
	const [subject, setSubject] = useState<Subject>("regex");
	const [input, setInput] = useState("");

	useDocumentMetadata(
		"Explainers",
		"Plain English for regular expressions, cron schedules, JWTs, curl commands and SQL.",
	);

	const active = SUBJECTS.find((entry) => entry.id === subject) ?? SUBJECTS[0];

	const { data, error, isPending, mutate, reset } = useMutation({
		mutationFn: (value: string) =>
			fetchJson<Explanation>(`/api/labs/explain/${subject}`, {
				body: JSON.stringify({ input: value }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			}),
	});

	function handleSubmit(event: FormEvent) {
		event.preventDefault();

		if (input.trim()) {
			mutate(input.trim());
		}
	}

	return (
		<main className="page">
			<h1>Explainers</h1>
			<p className="page-lede">
				Paste something dense and get it back in plain words, broken into its pieces.
			</p>

			<nav aria-label="Explainer subject" className="explain-subjects">
				{SUBJECTS.map((entry) => (
					<button
						aria-pressed={entry.id === subject}
						key={entry.id}
						onClick={() => {
							setSubject(entry.id);
							reset();
						}}
						type="button"
					>
						{entry.label}
					</button>
				))}
			</nav>

			<form className="ask-form" onSubmit={handleSubmit}>
				<label htmlFor="explain-input">{active.label} to explain</label>
				<textarea
					id="explain-input"
					onChange={(event) => setInput(event.target.value)}
					placeholder={active.placeholder}
					rows={4}
					value={input}
				/>
				<KeyRequiredNotice requires="polychat" what="Explainers" />
				<button disabled={isPending || !input.trim()} type="submit">
					{isPending ? "Reading" : "Explain"}
				</button>
			</form>

			{error ? (
				<p className="ask-error" role="alert">
					{error.message}
				</p>
			) : null}

			{data ? (
				<section aria-live="polite" className="ask-result">
					<h2>Summary</h2>
					<p>{data.summary}</p>
					{data.parts.length > 0 ? (
						<dl className="ask-fields">
							{data.parts.map((part) => (
								<div key={`${part.piece}-${part.detail}`}>
									<dt>{part.piece}</dt>
									<dd>{part.detail}</dd>
								</div>
							))}
						</dl>
					) : null}
					{data.warnings.length > 0 ? (
						<ul className="explain-warnings">
							{data.warnings.map((warning) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
					) : null}
				</section>
			) : null}
		</main>
	);
}
