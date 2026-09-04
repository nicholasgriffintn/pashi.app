import { Link } from "react-router-dom";

interface Experiment {
	blurb: string;
	id: string;
	state: "building" | "live";
	title: string;
}

const EXPERIMENTS: readonly Experiment[] = [
	{
		blurb:
			"Describe what you need in plain words. Pashi picks the tool, fills the form and runs it for you.",
		id: "ask",
		state: "building",
		title: "Ask Pashi",
	},
	{
		blurb:
			"Plain English for the things Pashi already parses: regular expressions, cron schedules, JWTs and curl commands.",
		id: "explain",
		state: "building",
		title: "Explainers",
	},
	{
		blurb:
			"A Model Context Protocol endpoint so coding agents can list and call the toolkit directly.",
		id: "mcp",
		state: "building",
		title: "Agent access",
	},
];

export function LabsPage() {
	return (
		<main className="page">
			<Link className="page-back" to="/">
				Pashi
			</Link>
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
					</li>
				))}
			</ul>
		</main>
	);
}
