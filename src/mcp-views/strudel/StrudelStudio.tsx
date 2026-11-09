import type { StrudelConfig } from "./config";
import type { PatternExample } from "./examples";
import { StrudelPlayer } from "./StrudelPlayer";

const STYLE_OPTIONS = [
	{ label: "Auto", value: "" },
	{ label: "Techno", value: "techno" },
	{ label: "Ambient", value: "ambient" },
	{ label: "House", value: "house" },
	{ label: "Jazz", value: "jazz" },
	{ label: "Drums", value: "drums" },
	{ label: "Experimental", value: "experimental" },
];

export interface StudioState {
	code: string;
	complexity: string;
	description: string;
	name: string;
	prompt: string;
	style: string;
	tagsInput: string;
	tempo: string;
}

interface StrudelStudioProps {
	config: StrudelConfig;
	examples: PatternExample[];
	isGenerating: boolean;
	isSaving: boolean;
	onChange: (patch: Partial<StudioState>) => void;
	onGenerate: () => void;
	onSave: () => void;
	onSelectExample: (example: PatternExample) => void;
	parsedTags: string[];
	selectedExampleId: string | null;
	state: StudioState;
}

export function StrudelStudio({
	config,
	examples,
	isGenerating,
	isSaving,
	onChange,
	onGenerate,
	onSave,
	onSelectExample,
	parsedTags,
	selectedExampleId,
	state,
}: StrudelStudioProps) {
	return (
		<div className="studio-grid">
			<div className="studio-main">
				<section className="panel">
					<div className="card-head">
						<span className="card-mark" aria-hidden="true">
							✦
						</span>
						<div>
							<h2 className="card-title">AI generation</h2>
							<p className="card-description">
								Describe the groove you want and we will craft a Strudel seed.
							</p>
						</div>
					</div>
					<label className="field">
						<span className="field-label">Describe your music</span>
						<textarea
							className="prose-input"
							maxLength={config.limits.promptLength}
							onChange={(event) => onChange({ prompt: event.target.value })}
							placeholder="e.g. hypnotic techno groove with syncopated hats and a rolling bassline"
							rows={4}
							value={state.prompt}
						/>
					</label>
					<div className="studio-options">
						<label className="field">
							<span className="field-label">Model</span>
							<select defaultValue="" disabled>
								<option value="">Auto (Default)</option>
							</select>
						</label>
						<label className="field">
							<span className="field-label">Style</span>
							<select
								onChange={(event) => onChange({ style: event.target.value })}
								value={state.style}
							>
								{STYLE_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
						<label className="field">
							<span className="field-label">Complexity</span>
							<select
								onChange={(event) => onChange({ complexity: event.target.value })}
								value={state.complexity}
							>
								{config.complexities.map((complexity) => (
									<option key={complexity} value={complexity}>
										{complexity[0].toUpperCase() + complexity.slice(1)}
									</option>
								))}
							</select>
						</label>
						<label className="field">
							<span className="field-label">Tempo (BPM)</span>
							<input
								inputMode="numeric"
								max={config.limits.tempo.max}
								min={config.limits.tempo.min}
								onChange={(event) => onChange({ tempo: event.target.value })}
								placeholder="120"
								type="number"
								value={state.tempo}
							/>
						</label>
					</div>
					<button
						type="button"
						className="button button-primary"
						disabled={isGenerating}
						onClick={onGenerate}
					>
						{isGenerating ? "Generating" : "Generate pattern"}
					</button>
				</section>

				<section className="panel">
					<h2 className="card-title">Pattern preview</h2>
					<p className="card-description">
						Listen to the current pattern and review the generated code.
					</p>
					<StrudelPlayer
						code={state.code}
						config={config}
						onChange={(code) => onChange({ code })}
					/>
				</section>
			</div>

			<div className="studio-side">
				<section className="panel">
					<h2 className="card-title">Pattern details</h2>
					<p className="card-description">Metadata used for sorting and sharing.</p>
					<label className="field">
						<span className="field-label">Name</span>
						<input
							maxLength={config.limits.nameLength}
							onChange={(event) => onChange({ name: event.target.value })}
							placeholder="Afterhours groove"
							value={state.name}
						/>
					</label>
					<label className="field">
						<span className="field-label">Description</span>
						<textarea
							className="prose-input"
							maxLength={config.limits.descriptionLength}
							onChange={(event) => onChange({ description: event.target.value })}
							placeholder="Optional notes about instrumentation, energy or structure."
							rows={3}
							value={state.description}
						/>
					</label>
					<label className="field">
						<span className="field-label">Tags (optional)</span>
						<input
							onChange={(event) => onChange({ tagsInput: event.target.value })}
							placeholder="drums, ambient, halftime"
							value={state.tagsInput}
						/>
						<span className="field-hint">Use commas to separate tags for filtering.</span>
					</label>
					{parsedTags.length > 0 ? (
						<ul className="tag-list">
							{parsedTags.map((tag) => (
								<li key={tag} className="tag">
									{tag}
								</li>
							))}
						</ul>
					) : null}
					<button
						type="button"
						className="button button-primary"
						disabled={isSaving}
						onClick={onSave}
					>
						{isSaving ? "Saving" : "Save pattern"}
					</button>
				</section>

				<section className="panel">
					<h2 className="card-title">Example patterns</h2>
					<p className="card-description">
						Start from a tried-and-tested groove. These load instantly, no AI request needed.
					</p>
					<div className="example-list">
						{examples.map((example) => (
							<button
								key={example.id}
								type="button"
								aria-label={`Load example pattern ${example.name}`}
								aria-pressed={selectedExampleId === example.id}
								className="example"
								onClick={() => onSelectExample(example)}
							>
								<span className="example-text">
									<span className="example-name">{example.name}</span>
									<span className="example-description">{example.description}</span>
								</span>
								<span className="tag">{example.category}</span>
							</button>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
