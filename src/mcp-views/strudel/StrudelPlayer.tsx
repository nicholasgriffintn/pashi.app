import { useCallback, useEffect, useRef, useState } from "react";

import { errorMessage } from "../shared/errors";
import type { StrudelConfig } from "./config";
import {
	confineStrudelTheme,
	loadStrudelRuntime,
	StrudelRuntimeBlockedError,
	sanitizeStrudelCode,
	type StrudelEditorUpdate,
	type StrudelMirrorInstance,
} from "./runtime";

interface StrudelPlayerProps {
	code: string;
	config: StrudelConfig;
	onChange: (code: string) => void;
	onPlay: (code: string) => void;
}

export function StrudelPlayer({ code, config, onChange, onPlay }: StrudelPlayerProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [blocked, setBlocked] = useState<string | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const editorRef = useRef<StrudelMirrorInstance | null>(null);
	const loadingRef = useRef<Promise<StrudelMirrorInstance | null> | null>(null);
	const mountedRef = useRef(false);
	const evalFailedRef = useRef(false);
	const latestCodeRef = useRef(code);
	const onChangeRef = useRef(onChange);
	const onPlayRef = useRef(onPlay);

	useEffect(() => {
		latestCodeRef.current = code;
		onChangeRef.current = onChange;
		onPlayRef.current = onPlay;
	}, [code, onChange, onPlay]);

	const createEditor = useCallback(async () => {
		if (editorRef.current) {
			return editorRef.current;
		}

		if (loadingRef.current) {
			return loadingRef.current;
		}

		const root = rootRef.current;

		if (!root) {
			return null;
		}

		loadingRef.current = (async () => {
			setIsLoading(true);

			try {
				const runtime = await loadStrudelRuntime(config);

				if (!mountedRef.current || editorRef.current || rootRef.current !== root) {
					return editorRef.current;
				}

				const editor = new runtime.StrudelMirror({
					defaultOutput: runtime.webaudioOutput,
					drawTime: [-2, 2],
					getTime: () => runtime.getAudioContext().currentTime,
					initialCode: sanitizeStrudelCode(latestCodeRef.current),
					onChange: (update: StrudelEditorUpdate) => {
						if (update.docChanged) {
							onChangeRef.current(update.state.doc.toString());
						}
					},
					onEvalError: (evalError: unknown) => {
						evalFailedRef.current = true;

						if (mountedRef.current) {
							setError(errorMessage(evalError, String(evalError)));
							setIsPlaying(false);
						}
					},
					prebake: runtime.prebake,
					root,
					theme: "teletext",
					transpiler: runtime.transpiler,
				});

				editor.setTheme?.("tokyoNight");
				confineStrudelTheme(root);
				editorRef.current = editor;
				setError(null);

				return editor;
			} catch (loadError) {
				if (mountedRef.current && loadError instanceof StrudelRuntimeBlockedError) {
					setBlocked(loadError.message);
				} else if (mountedRef.current) {
					setError(errorMessage(loadError, "Unable to load the Strudel runtime."));
				}

				return null;
			} finally {
				if (mountedRef.current) {
					setIsLoading(false);
				}

				loadingRef.current = null;
			}
		})();

		return loadingRef.current;
	}, [config]);

	useEffect(() => {
		mountedRef.current = true;
		void createEditor();

		return () => {
			mountedRef.current = false;

			if (editorRef.current) {
				void editorRef.current.stop();
				editorRef.current.clear();
				editorRef.current = null;
			}
		};
	}, [createEditor]);

	useEffect(() => {
		const sanitised = sanitizeStrudelCode(code);

		if (editorRef.current && editorRef.current.code !== sanitised) {
			editorRef.current.setCode(sanitised);
		}
	}, [code]);

	const play = useCallback(async () => {
		const editor = editorRef.current ?? (await createEditor());

		if (!editor) {
			return;
		}

		evalFailedRef.current = false;

		try {
			await editor.evaluate();

			if (!evalFailedRef.current) {
				setIsPlaying(true);
				setError(null);
				onPlayRef.current(latestCodeRef.current);
			}
		} catch (evalError) {
			setError(errorMessage(evalError, "Evaluation error"));
		}
	}, [createEditor]);

	const pause = useCallback(() => {
		if (!editorRef.current) {
			return;
		}

		void editorRef.current.stop();
		setIsPlaying(false);
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.altKey && event.key === "Enter") {
				event.preventDefault();
				void play();
			} else if (event.altKey && (event.key === "." || event.key === "≥")) {
				event.preventDefault();
				pause();
			}
		};

		window.addEventListener("keydown", onKeyDown);

		return () => window.removeEventListener("keydown", onKeyDown);
	}, [play, pause]);

	return (
		<div className="strudel-player">
			<div className="strudel-deck">
				<div className="strudel-deck-bar">
					<span className="strudel-deck-label">Strudel Live Code</span>
					<span className="strudel-deck-status" aria-live="polite">
						{isLoading ? "Loading the runtime" : isPlaying ? "Playing current pattern" : ""}
					</span>
					<div className="strudel-deck-controls">
						{isPlaying ? <span className="strudel-live">Live</span> : null}
						<button
							type="button"
							className="button button-primary"
							onClick={() => void play()}
							disabled={isLoading || blocked !== null}
							aria-label={isPlaying ? "update" : "play"}
						>
							{isPlaying ? "Update" : "Play"}
						</button>
						<button
							type="button"
							className="button button-loud"
							onClick={pause}
							disabled={!isPlaying}
							aria-label="pause"
						>
							Pause
						</button>
					</div>
				</div>
				<div ref={rootRef} className="strudel-editor">
					{blocked ? (
						<p className="strudel-blocked" role="alert">
							{blocked}
						</p>
					) : null}
				</div>
				{error ? (
					<p className="strudel-error" role="alert">
						{error}
					</p>
				) : null}
			</div>
			<p className="field-hint">
				The Strudel REPL runs entirely in your browser. Edit the code and press <kbd>Alt+Enter</kbd>{" "}
				to play, <kbd>Alt+.</kbd> to pause.
			</p>
		</div>
	);
}
