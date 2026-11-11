import { Link } from "react-router-dom";

import { useDocumentMetadata } from "../lib/use-document-metadata";

interface Experiment {
	blurb: string;
	id: string;
	path?: string;
	state: "building" | "live";
	title: string;
}

const EXPERIMENTS: readonly Experiment[] = [
	{
		blurb:
			"Describe what you need in plain words. Pashi picks the tool, fills the form and runs it for you.",
		id: "ask",
		path: "/labs/ask",
		state: "live",
		title: "Ask Pashi",
	},
	{
		blurb:
			"Plain English for the things Pashi already parses: regular expressions, cron schedules, JWTs and curl commands.",
		id: "explain",
		path: "/labs/explain",
		state: "live",
		title: "Explainers",
	},
	{
		blurb:
			"Pashi's games and tool views are MCP Apps. Play Charades, Photo Sorter, Twenty Questions, Strudel, Verbatim and Polis here, or add https://pashi.app/mcp as an MCP server in Polychat or any host that renders apps. The games need Polychat or an API key.",
		id: "mcp-apps",
		path: "/labs/apps",
		state: "live",
		title: "MCP Apps",
	},
];

export function LabsPage() {
	useDocumentMetadata(
		"Labs",
		"AI experiments in Pashi: plain English tool routing, format explainers and MCP Apps.",
	);

	return (
		<main className="page">
			<h1>Labs</h1>
			<p className="page-lede">
				Experiments that are not finished enough to be tools yet. Expect these to change or
				disappear.
			</p>
			<ul className="lab-list">
				{EXPERIMENTS.map((experiment) => (
					<li key={experiment.id}>
						<div className="lab-head">
							<h2>{experiment.title}</h2>
							<span className="lab-state" data-state={experiment.state}>
								{experiment.state === "live" ? "Live" : "Building"}
							</span>
						</div>
						<p>{experiment.blurb}</p>
						{experiment.path ? (
							<Link className="card-action" to={experiment.path}>
								Open <span aria-hidden="true">→</span>
							</Link>
						) : null}
					</li>
				))}
			</ul>
		</main>
	);
}
