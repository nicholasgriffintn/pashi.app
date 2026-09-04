import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useApiKey } from "../lib/api-key-context";
import { fetchJson } from "../lib/query-client";

interface ToolRoute {
	confidence: number;
	fields: Record<string, string>;
	input: string;
	path: string;
	reason: string;
	toolId: string;
	toolLabel: string;
	toolType: "converter" | "generator";
}

const EXAMPLES = [
	"five uppercase v7 uuids",
	"a strong 24 character password with symbols",
	"turn this markdown into jira markup",
	"what are the odds of rolling 15 or more on 3d6",
];

function routeUrl(route: ToolRoute) {
	const params = new URLSearchParams();

	if (route.input) {
		params.set("input", route.input);
	}

	for (const [key, value] of Object.entries(route.fields)) {
		params.set(key, value);
	}

	const query = params.toString();

	return query ? `${route.path}?${query}` : route.path;
}

export function AskPage() {
	const navigate = useNavigate();
	const { apiKey } = useApiKey();
	const [request, setRequest] = useState("");

	const { data, error, isPending, mutate } = useMutation({
		mutationFn: (value: string) =>
			fetchJson<ToolRoute>("/api/labs/ask", {
				body: JSON.stringify({ input: value }),
				headers: {
					"Content-Type": "application/json",
					...(apiKey.trim() ? { "X-API-Key": apiKey.trim() } : {}),
				},
				method: "POST",
			}),
	});

	function handleSubmit(event: FormEvent) {
		event.preventDefault();

		if (request.trim()) {
			mutate(request.trim());
		}
	}

	return (
		<main className="page">
			<Link className="page-back" to="/labs">
				Labs
			</Link>
			<h1>Ask Pashi</h1>
			<p className="page-lede">
				Describe what you need. Pashi picks the tool and fills the form, then you run it.
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
				<button disabled={isPending || !request.trim()} type="submit">
					{isPending ? "Thinking" : "Find the tool"}
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

			{data ? (
				<section className="ask-result" aria-live="polite">
					<h2>{data.toolLabel}</h2>
					<p>{data.reason}</p>
					<dl className="ask-fields">
						{data.input ? (
							<div>
								<dt>input</dt>
								<dd>{data.input}</dd>
							</div>
						) : null}
						{Object.entries(data.fields).map(([key, value]) => (
							<div key={key}>
								<dt>{key}</dt>
								<dd>{value}</dd>
							</div>
						))}
					</dl>
					<button onClick={() => void navigate(routeUrl(data))} type="button">
						Open {data.toolLabel}
					</button>
				</section>
			) : null}
		</main>
	);
}
