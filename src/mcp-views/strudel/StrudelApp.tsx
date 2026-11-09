import { useState } from "react";

import { Toast, useToast } from "../shared/Toast";
import type { StrudelConfig, StrudelPattern } from "./config";
import { CreateStudio } from "./CreateStudio";
import { PatternEditor } from "./PatternEditor";
import { PatternGrid } from "./PatternGrid";
import { useStrudelLibrary } from "./useStrudelLibrary";

type Screen = { name: "edit"; pattern: StrudelPattern } | { name: "library" } | { name: "new" };

export function StrudelApp({ config }: { config: StrudelConfig }) {
	const library = useStrudelLibrary();
	const { show, toast } = useToast();
	const [screen, setScreen] = useState<Screen>({ name: "library" });
	const openLibrary = () => setScreen({ name: "library" });

	return (
		<main className="view strudel">
			<header className="view-head">
				<div>
					<p className="eyebrow">Pashi studio</p>
					<h1 className="view-title">Strudel</h1>
				</div>
				{screen.name === "library" ? null : (
					<button type="button" className="button" onClick={openLibrary}>
						All patterns
					</button>
				)}
			</header>

			{screen.name === "new" ? (
				<CreateStudio
					config={config}
					library={library}
					notify={show}
					onSaved={(pattern) => setScreen({ name: "edit", pattern })}
				/>
			) : null}

			{screen.name === "edit" ? (
				<PatternEditor
					key={screen.pattern.id}
					config={config}
					library={library}
					onDeleted={openLibrary}
					onSaved={(pattern) => {
						show("Pattern saved");
						setScreen({ name: "edit", pattern });
					}}
					pattern={screen.pattern}
				/>
			) : null}

			{screen.name === "library" && library.isLoading ? (
				<output className="muted">Loading music patterns</output>
			) : null}

			{screen.name === "library" && !library.isLoading && library.loadError ? (
				<section className="empty-state">
					<h2 className="card-title">Patterns unavailable</h2>
					<p className="card-description">{library.loadError}</p>
					<button
						type="button"
						className="button button-primary"
						onClick={() => setScreen({ name: "new" })}
					>
						New pattern
					</button>
				</section>
			) : null}

			{screen.name === "library" && !library.isLoading && !library.loadError ? (
				<PatternGrid
					onNew={() => setScreen({ name: "new" })}
					onOpen={(pattern) => setScreen({ name: "edit", pattern })}
					patterns={library.patterns}
				/>
			) : null}

			<Toast toast={toast} />
		</main>
	);
}
