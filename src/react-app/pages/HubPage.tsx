import { Link } from "react-router-dom";

import { PaletteButton } from "../components/PaletteButton";
import { PashiLogoButton } from "../components/PashiLogoButton";
import { ThemeToggle } from "../components/ThemeToggle";
import { PROJECTS, STATUS_LABELS, type Project } from "../lib/projects";
import { useDocumentMetadata } from "../lib/use-document-metadata";

function ProjectCard({ project }: { project: Project }) {
	const body = (
		<>
			<span className="project-card-status" data-status={project.status}>
				{STATUS_LABELS[project.status]}
			</span>
			<h2>{project.name}</h2>
			<p>{project.blurb}</p>
			<ul className="project-card-stack">
				{project.stack.map((item) => (
					<li key={item}>{item}</li>
				))}
			</ul>
		</>
	);

	if (project.external) {
		return (
			<a className="project-card" href={project.url} rel="noreferrer" target="_blank">
				{body}
				<span className="project-card-go">Open site</span>
			</a>
		);
	}

	return (
		<Link className="project-card" to={project.url}>
			{body}
			<span className="project-card-go">Open</span>
		</Link>
	);
}

export function HubPage() {
	useDocumentMetadata("Pashi");

	return (
		<main className="hub">
			<header className="hub-header">
				<div className="hub-intro">
					<h1>Pashi</h1>
					<p className="intro">
						The home for things I build. Small tools, running experiments, and the odd whole app.
					</p>
					<PaletteButton label="Search everything" />
				</div>
				<PashiLogoButton className="hub-logo-button" imageClassName="hub-logo" />
			</header>

			<section aria-labelledby="hub-projects-title" className="hub-projects">
				<h2 className="hub-section-title" id="hub-projects-title">
					Projects
				</h2>
				<div className="project-grid">
					{PROJECTS.map((project) => (
						<ProjectCard key={project.id} project={project} />
					))}
				</div>
			</section>

			<footer className="hub-footer">
				<ThemeToggle />
				<Link to="/api">API</Link>
				<Link to="/about">About</Link>
				<a href="https://github.com/nicholasgriffintn/pashi.app" rel="noreferrer" target="_blank">
					Source
				</a>
			</footer>
		</main>
	);
}
