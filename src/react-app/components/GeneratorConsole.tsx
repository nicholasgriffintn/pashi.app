import {
	type FormEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import { generateThing } from "../lib/generate-api";
import { fetchGeneratorInfo, type GeneratorInfoTool } from "../lib/generator-info";
import {
	createImageResult,
	findToolByRoute,
	getDefaultFieldValues,
	getDefaultInput,
	getInitialValues,
	getRouteToolId,
	pushGeneratorRoute,
} from "../lib/generator-state";
import { GeneratorForm } from "./GeneratorForm";
import { PashiLogoButton } from "./PashiLogoButton";
import { ResultActions } from "./ResultActions";
import { ResultStage, type ResultStageValue } from "./ResultStage";

export function GeneratorConsole() {
	const initialRouteToolId = getRouteToolId();
	const [tools, setTools] = useState<GeneratorInfoTool[]>([]);
	const [exportFormats, setExportFormats] = useState<string[]>([]);
	const [activeToolId, setActiveToolId] = useState(initialRouteToolId ?? "");
	const [input, setInput] = useState("");
	const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
	const [error, setError] = useState("");
	const [isInfoLoading, setIsInfoLoading] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [generateId, setGenerateId] = useState(0);
	const [notification, setNotification] = useState("");
	const [result, setResult] = useState<ResultStageValue | undefined>();
	const notificationTimer = useRef<number | undefined>(undefined);

	const activeTool = tools.find((tool) => tool.id === activeToolId);
	const hasFields = Boolean(activeTool?.input.fields?.length);
	const notify = useCallback((message: string) => {
		window.clearTimeout(notificationTimer.current);
		setNotification(message);
		notificationTimer.current = window.setTimeout(() => setNotification(""), 2400);
	}, []);

	useEffect(() => {
		return () => window.clearTimeout(notificationTimer.current);
	}, [notify]);

	useEffect(() => {
		let ignore = false;

		fetchGeneratorInfo()
			.then((info) => {
				if (ignore || info.tools.length === 0) {
					return;
				}

				const routeToolId = getRouteToolId();
				const nextTool =
					findToolByRoute(info.tools, routeToolId) ?? info.tools[0];
				setTools(info.tools);
				setExportFormats(info.exportFormats);
				setActiveToolId(nextTool.id);
				const initialValues = getInitialValues(nextTool);
				setInput(initialValues.input);
				setFieldValues(initialValues.fields);
				setResult(
					nextTool.result.kind === "image"
						? createImageResult(nextTool, initialValues.input, initialValues.fields, 0)
						: undefined,
				);
			})
			.catch((caught) => {
				if (!ignore) {
					setError(caught instanceof Error ? caught.message : "Could not load generators.");
				}
			})
			.finally(() => {
				if (!ignore) {
					setIsInfoLoading(false);
					notify("Generators ready");
				}
			});

		return () => {
			ignore = true;
		};
	}, [notify]);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		await generateActiveTool();
	}

	async function generateActiveTool() {
		setError("");
		setIsLoading(true);

		if (!activeTool) {
			setError("Generators are still loading.");
			setIsLoading(false);
			return;
		}

		if (activeTool.result.kind === "image") {
			const payload = hasFields ? fieldValues : input.trim();
			if (!hasFields && !payload) {
				setError("Give Pashi something to generate.");
				setIsLoading(false);
				return;
			}

			const nextGenerateId = generateId + 1;
			setGenerateId(nextGenerateId);
			setResult(createImageResult(activeTool, input, fieldValues, nextGenerateId));
			return;
		}

		try {
			setResult(await generateThing(activeTool.endpoint, input, fieldValues));
			setIsLoading(false);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Generation failed.");
			setIsLoading(false);
		}
	}

	function handleToolChange(nextToolId: string) {
		const nextTool = tools.find((tool) => tool.id === nextToolId);
		if (!nextTool) {
			return;
		}

		setActiveToolId(nextToolId);
		setInput(getDefaultInput(nextTool));
		setFieldValues(getDefaultFieldValues(nextTool));
		setError("");
		setResult(undefined);
		pushGeneratorRoute(nextTool.id);
	}

	function handleFieldChange(fieldId: string, value: string) {
		setFieldValues((current) => ({
			...current,
			[fieldId]: value,
		}));
	}

	return (
		<main className="shell">
			<section className="hero" aria-labelledby="pashi-title">
				<div className="copy">
					<PashiLogoButton
						className="mobile-logo-button"
						imageClassName="mobile-logo"
						isLoading={isInfoLoading}
					/>
					<h1 id="pashi-title">Pashi</h1>
					<p className="intro">Tiny generators for quick output.</p>

					{!activeTool ? (
						<div aria-busy="true" className="generator generator-loading">
							<label>Generator</label>
							<p className="tool-description">
								{isInfoLoading ? `Loading ${activeToolId || "generators"}` : "No generators available"}
							</p>
						</div>
					) : (
						<GeneratorForm
							activeTool={activeTool}
							error={error}
							fieldValues={fieldValues}
							input={input}
							isLoading={isLoading}
							onFieldChange={handleFieldChange}
							onInputChange={setInput}
							onSubmit={handleSubmit}
							onToolChange={handleToolChange}
							tools={tools}
						/>
					)}
				</div>

				<div className="showcase">
					<PashiLogoButton
						className="mascot-button"
						imageClassName="mascot"
						isLoading={isInfoLoading}
					/>
					{isInfoLoading ? (
						<ScreenReaderStatus message="Loading generators" />
					) : null}
					<ResultStage
						actions={
							result && activeTool ? (
								<ResultActions
									exportFormats={exportFormats}
									fields={fieldValues}
									input={input}
									onClear={() => setResult(undefined)}
									onNotify={notify}
									onRegenerate={() => {
										void generateActiveTool();
									}}
									result={result}
									tool={activeTool}
								/>
							) : undefined
						}
						isLoading={isLoading}
						onImageLoad={() => setIsLoading(false)}
						result={result}
					/>
				</div>
			</section>
			{notification ? (
				<div className="pashi-toast" role="status">
					{notification}
				</div>
			) : null}
		</main>
	);
}

function ScreenReaderStatus({ message }: { message: string }) {
	return (
		<p className="sr-only" role="status">
			{message}
		</p>
	);
}
