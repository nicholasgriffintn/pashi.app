import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { PashiLogoButton } from "../components/PashiLogoButton";
import { appPreviewProjects, appPreviewsQueryOptions } from "../lib/app-previews";
import { PROJECTS, STATUS_LABELS, type Project, type ProjectKind } from "../lib/projects";
import { useDocumentMetadata } from "../lib/use-document-metadata";

const SECTIONS: { kind: ProjectKind; title: string }[] = [
	{ kind: "project", title: "Projects" },
	{ kind: "app", title: "Apps" },
	{ kind: "extension", title: "Chrome extensions" },
];

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
				<span className="card-action">
					Open site <span aria-hidden="true">↗</span>
				</span>
			</a>
		);
	}

	return (
		<Link className="project-card" to={project.url}>
			{body}
			<span className="card-action">
				Open <span aria-hidden="true">→</span>
			</span>
		</Link>
	);
}

export function HubPage() {
	const previews = useQuery(appPreviewsQueryOptions);
	const projects = [...PROJECTS, ...appPreviewProjects(previews.data?.apps ?? [])];

	useDocumentMetadata("Pashi");

	return (
		<main className="hub">
			<header className="hub-header">
				<div className="hub-intro">
					<h1>Pashi</h1>
					<p className="intro">
						The home for things I build. Small tools, running experiments, and the odd whole app.
					</p>
				</div>
				<PashiLogoButton className="hub-logo-button" imageClassName="hub-logo" />
			</header>

			{SECTIONS.map((section) => {
				const entries = projects.filter((project) => project.kind === section.kind);

				return entries.length > 0 ? (
					<section
						aria-labelledby={`hub-${section.kind}-title`}
						className="hub-projects"
						key={section.kind}
					>
						<h2 className="hub-section-title" id={`hub-${section.kind}-title`}>
							{section.title}
						</h2>
						<div className="project-grid">
							{entries.map((project) => (
								<ProjectCard key={project.id} project={project} />
							))}
						</div>
					</section>
				) : null;
			})}
		</main>
	);
}
