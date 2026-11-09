import type { StrudelPattern } from "./config";

interface PatternGridProps {
	onNew: () => void;
	onOpen: (pattern: StrudelPattern) => void;
	patterns: StrudelPattern[];
}

export function PatternGrid({ onNew, onOpen, patterns }: PatternGridProps) {
	if (patterns.length === 0) {
		return (
			<section className="empty-state">
				<span className="card-mark" aria-hidden="true">
					♫
				</span>
				<h2 className="card-title">No patterns yet</h2>
				<p className="card-description">Write or generate a live-coded music pattern.</p>
				<button type="button" className="button button-primary" onClick={onNew}>
					New pattern
				</button>
			</section>
		);
	}

	return (
		<div className="pattern-library">
			<div className="pattern-library-actions">
				<button type="button" className="button button-primary" onClick={onNew}>
					New pattern
				</button>
			</div>
			<ul className="pattern-grid">
				{patterns.map((pattern) => (
					<li key={pattern.id}>
						<button type="button" className="pattern-card" onClick={() => onOpen(pattern)}>
							<span className="pattern-card-head">
								<span className="card-mark" aria-hidden="true">
									♫
								</span>
								<span>
									<span className="pattern-card-name">{pattern.name}</span>
									<span className="pattern-card-date">
										Updated {new Date(pattern.updatedAt).toLocaleDateString()}
									</span>
								</span>
							</span>
							{pattern.description ? (
								<span className="pattern-card-description">{pattern.description}</span>
							) : null}
							<pre className="pattern-card-code">{pattern.code}</pre>
							{pattern.tags.length ? (
								<span className="tag-list">
									{pattern.tags.map((tag) => (
										<span key={tag} className="tag">
											{tag}
										</span>
									))}
								</span>
							) : null}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
