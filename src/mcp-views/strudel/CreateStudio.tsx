import { useMemo, useState } from "react";

import { errorMessage } from "../shared/errors";
import { host } from "../shared/host";
import { parseCommaSeparatedTags } from "../shared/text";
import type { ToastTone } from "../shared/Toast";
import type { StrudelConfig, StrudelPattern } from "./config";
import { defaultCode, examplePatterns, type PatternExample } from "./examples";
import { needsPolychatSignIn, SignInState } from "./SignInState";
import { StrudelStudio, type StudioState } from "./StrudelStudio";
import type { PatternDraft, StrudelLibrary } from "./useStrudelLibrary";

interface CreateStudioProps {
	config: StrudelConfig;
	library: StrudelLibrary;
	notify: (text: string, tone?: ToastTone) => void;
	onSaved: (pattern: StrudelPattern) => void;
}

export function CreateStudio({ config, library, notify, onSaved }: CreateStudioProps) {
	const [state, setState] = useState<StudioState>({
		code: defaultCode,
		complexity: "medium",
		description: "",
		name: "",
		prompt: "",
		style: "",
		tagsInput: "",
		tempo: "",
	});
	const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [refusedDraft, setRefusedDraft] = useState<PatternDraft | null>(null);
	const [linkError, setLinkError] = useState<string | null>(null);
	const parsedTags = useMemo(() => parseCommaSeparatedTags(state.tagsInput), [state.tagsInput]);
	const update = (patch: Partial<StudioState>) => setState((current) => ({ ...current, ...patch }));

	const generate = async () => {
		if (!state.prompt.trim()) {
			notify("Describe what you want to hear first", "error");

			return;
		}

		setIsGenerating(true);

		try {
			const result = await library.generate({
				complexity: state.complexity,
				prompt: state.prompt.trim(),
				style: state.style || undefined,
				tempo: state.tempo ? Number(state.tempo) : undefined,
			});

			update({
				code: result.code,
				name: state.name.trim() ? state.name : state.prompt.slice(0, 64),
			});
			notify("Generated a new Strudel pattern");
		} catch (error) {
			const message = errorMessage(error, "Unable to generate pattern");

			setLinkError(needsPolychatSignIn(message) ? message : null);
			notify(message, "error");
		} finally {
			setIsGenerating(false);
		}
	};

	const save = async () => {
		if (!state.name.trim()) {
			notify("Give your pattern a name", "error");

			return;
		}

		const draft: PatternDraft = {
			code: state.code,
			description: state.description.trim() || undefined,
			name: state.name.trim(),
			tags: parsedTags,
		};

		setIsSaving(true);

		try {
			const pattern = await library.save(draft);

			notify("Pattern saved");
			onSaved(pattern);
		} catch (error) {
			const message = errorMessage(error, "Failed to save pattern");

			setLinkError(needsPolychatSignIn(message) ? message : null);
			setRefusedDraft(host.embedded() && !needsPolychatSignIn(message) ? draft : null);
			notify(message, "error");
		} finally {
			setIsSaving(false);
		}
	};

	const loadExample = (example: PatternExample) => {
		setSelectedExampleId(example.id);
		update({ code: example.code, name: state.name.trim() ? state.name : example.name });
		notify(`Loaded ${example.name}`);
	};

	return (
		<>
			{linkError ? <SignInState siteUrl={config.siteUrl} /> : null}
			{refusedDraft ? (
				<p className="notice">
					This host only lets the view read. Saving can still happen in a chat.{" "}
					<button
						type="button"
						className="button"
						onClick={() => void library.saveFromChat(refusedDraft)}
					>
						Save from a chat instead
					</button>
				</p>
			) : null}
			<StrudelStudio
				config={config}
				examples={examplePatterns}
				isGenerating={isGenerating}
				isSaving={isSaving}
				onChange={update}
				onGenerate={() => void generate()}
				onSave={() => void save()}
				onSelectExample={loadExample}
				parsedTags={parsedTags}
				selectedExampleId={selectedExampleId}
				state={state}
			/>
		</>
	);
}
