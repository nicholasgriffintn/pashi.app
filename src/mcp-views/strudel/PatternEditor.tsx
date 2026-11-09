import { useMemo, useState } from "react";

import { errorMessage } from "../shared/errors";
import { host } from "../shared/host";
import { parseCommaSeparatedTags } from "../shared/text";
import type { StrudelConfig, StrudelPattern } from "./config";
import { needsPolychatSignIn, SignInState } from "./SignInState";
import { StrudelPlayer } from "./StrudelPlayer";
import type { PatternDraft, StrudelLibrary } from "./useStrudelLibrary";

const STARTER_PATTERN = 's("bd sd, hh*8").bank("RolandTR909").gain(0.8)';

interface PatternEditorProps {
	config: StrudelConfig;
	library: StrudelLibrary;
	onDeleted: () => void;
	onSaved: (pattern: StrudelPattern) => void;
	pattern: StrudelPattern;
}

export function PatternEditor({
	config,
	library,
	onDeleted,
	onSaved,
	pattern,
}: PatternEditorProps) {
	const [name, setName] = useState(pattern.name);
	const [description, setDescription] = useState(pattern.description ?? "");
	const [tagsInput, setTagsInput] = useState(pattern.tags.join(", "));
	const [prompt, setPrompt] = useState("");
	const [code, setCode] = useState(pattern.code || STARTER_PATTERN);
	const [busy, setBusy] = useState<"deleting" | "generating" | "saving" | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [refusedDraft, setRefusedDraft] = useState<PatternDraft | null>(null);
	const tags = useMemo(() => parseCommaSeparatedTags(tagsInput), [tagsInput]);

	const run = async (kind: "deleting" | "generating" | "saving", action: () => Promise<void>) => {
		setBusy(kind);
		setError(null);

		try {
			await action();
		} catch (actionError) {
			setError(errorMessage(actionError, "That did not work."));
		} finally {
			setBusy(null);
		}
	};

	const generate = () =>
		run("generating", async () => {
			const result = await library.generate({ complexity: "medium", prompt: prompt.trim() });

			setCode(result.code);
		});

	const save = () => {
		const draft: PatternDraft = {
			code,
			description: description.trim() || undefined,
			id: pattern.id,
			name: name.trim(),
			tags,
		};

		return run("saving", async () => {
			try {
				onSaved(await library.save(draft));
				setRefusedDraft(null);
			} catch (saveError) {
				setRefusedDraft(host.embedded() ? draft : null);
				throw saveError;
			}
		});
	};

	const remove = () =>
		run("deleting", async () => {
			await library.remove(pattern.id);
			onDeleted();
		});

	return (
		<div className="editor-grid">
			<StrudelPlayer code={code} config={config} onChange={setCode} />
			<section className="panel editor-form">
				<label className="field">
					<span className="field-label">Name</span>
					<input
						maxLength={config.limits.nameLength}
						onChange={(event) => setName(event.target.value)}
						value={name}
					/>
				</label>
				<label className="field">
					<span className="field-label">Tags (optional)</span>
					<input
						onChange={(event) => setTagsInput(event.target.value)}
						placeholder="drums, ambient, halftime"
						value={tagsInput}
					/>
				</label>
				{tags.length > 0 ? (
					<ul className="tag-list">
						{tags.map((tag) => (
							<li key={tag} className="tag">
								{tag}
							</li>
						))}
					</ul>
				) : null}
				<label className="field">
					<span className="field-label">Description</span>
					<textarea
						className="prose-input"
						maxLength={config.limits.descriptionLength}
						onChange={(event) => setDescription(event.target.value)}
						value={description}
					/>
				</label>
				<label className="field">
					<span className="field-label">Generate from a prompt</span>
					<textarea
						className="prose-input"
						maxLength={config.limits.promptLength}
						onChange={(event) => setPrompt(event.target.value)}
						placeholder="A warm, slow lo-fi beat"
						value={prompt}
					/>
				</label>
				<button
					type="button"
					className="button"
					disabled={!prompt.trim() || busy !== null}
					onClick={() => void generate()}
				>
					{busy === "generating" ? "Generating" : "Generate pattern"}
				</button>
				{needsPolychatSignIn(error) ? <SignInState siteUrl={config.siteUrl} /> : null}
				{error && !needsPolychatSignIn(error) ? (
					<p className="alert" role="alert">
						{error}
					</p>
				) : null}
				{refusedDraft ? (
					<button
						type="button"
						className="button"
						onClick={() => void library.saveFromChat(refusedDraft)}
					>
						Save from a chat instead
					</button>
				) : null}
				<div className="editor-actions">
					<button
						type="button"
						className="button button-primary"
						disabled={!name.trim() || !code.trim() || busy !== null}
						onClick={() => void save()}
					>
						{busy === "saving" ? "Saving" : "Save"}
					</button>
					<button
						type="button"
						className="button button-loud"
						aria-label="Delete pattern"
						disabled={busy !== null}
						onClick={() => void remove()}
					>
						{busy === "deleting" ? "Deleting" : "Delete"}
					</button>
				</div>
			</section>
		</div>
	);
}
