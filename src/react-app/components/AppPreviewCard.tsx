import { Link } from "react-router-dom";

import { APP_ACCESS_LABELS, type AppPreview, appPagePath } from "../../shared/app-previews";

export function AppPreviewCard({ full = false, preview }: { full?: boolean; preview: AppPreview }) {
	return (
		<article className="project-card">
			<span className="project-card-status" data-status="lab">
				{preview.category}
			</span>
			<h2>{full ? preview.name : <Link to={appPagePath(preview.id)}>{preview.name}</Link>}</h2>
			<p>{preview.description}</p>
			<p className="app-card-uses">
				<strong>Uses:</strong> {preview.uses}
			</p>
			<p className="app-card-uses">
				<strong>Produces:</strong> {preview.produces}
			</p>
			{full ? (
				<p className="app-card-uses">
					<strong>When:</strong> {preview.when}
				</p>
			) : null}
			<p className="app-card-uses">
				<strong>To open it, you need</strong> {APP_ACCESS_LABELS[preview.access]}
			</p>
			<Link className="card-action" to="/sign-in">
				Sign in to open <span aria-hidden="true">→</span>
			</Link>
		</article>
	);
}
