import { type FormEvent, useEffect, useState } from "react";

import { generateThing } from "../lib/generate-api";
import {
	fetchGeneratorInfo,
	getFallbackTool,
	type GeneratorInfoTool,
} from "../lib/generator-info";
import { ResultActions } from "./ResultActions";
import { ResultStage, type ResultStageValue } from "./ResultStage";
import { ToolPicker } from "./ToolPicker";

const DEFAULT_INPUT = "https://pashi.app";
const QR_SIZE = "360x360";

export function GeneratorConsole() {
	const [tools, setTools] = useState<GeneratorInfoTool[]>([getFallbackTool()]);
	const [activeToolId, setActiveToolId] = useState(getRouteToolId() ?? "qr");
	const [input, setInput] = useState(DEFAULT_INPUT);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [generateId, setGenerateId] = useState(0);
	const [result, setResult] = useState<ResultStageValue | undefined>(() =>
		createQrResult(getFallbackTool(), DEFAULT_INPUT, 0),
	);

	const activeTool = tools.find((tool) => tool.id === activeToolId) ?? tools[0];
	useEffect(() => {
		let ignore = false;

		fetchGeneratorInfo()
			.then((info) => {
				if (ignore || info.tools.length === 0) {
					return;
				}

				const routeToolId = getRouteToolId();
				const nextTool =
					info.tools.find((tool) => tool.id === routeToolId) ?? info.tools[0];
				setTools(info.tools);
				setActiveToolId(nextTool.id);
				setInput(getDefaultInput(nextTool));
				setResult(
					nextTool.result.kind === "image"
						? createQrResult(nextTool, getDefaultInput(nextTool), 0)
						: undefined,
				);
			})
			.catch((caught) => {
				if (!ignore) {
					setError(caught instanceof Error ? caught.message : "Could not load generators.");
				}
			});

		return () => {
			ignore = true;
		};
	}, []);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		await generateActiveTool();
	}

	async function generateActiveTool() {
		setError("");
		setIsLoading(true);

		if (activeTool.result.kind === "image") {
			const payload = input.trim();
			if (!payload) {
				setError("Give Pashi something to generate.");
				setIsLoading(false);
				return;
			}

			const nextGenerateId = generateId + 1;
			setGenerateId(nextGenerateId);
			setResult(createQrResult(activeTool, payload, nextGenerateId));
			return;
		}

		try {
			setResult(await generateThing(activeTool.endpoint, input));
			setIsLoading(false);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Generation failed.");
			setIsLoading(false);
		}
	}

	function handleToolChange(nextToolId: string) {
		const nextTool = tools.find((tool) => tool.id === nextToolId) ?? tools[0];
		setActiveToolId(nextToolId);
		setInput(getDefaultInput(nextTool));
		setError("");
		setResult(undefined);
		pushGeneratorRoute(nextTool.id);
	}

	return (
		<main className="shell">
			<section className="hero" aria-labelledby="pashi-title">
				<div className="copy">
					<img alt="Pashi mascot logo" className="mobile-logo" src="/logo.svg" />
					<h1 id="pashi-title">Pashi</h1>
					<p className="intro">Generate useful little things in a flash.</p>

					<form className="generator" onSubmit={handleSubmit}>
						<label>Generator</label>
						<ToolPicker
							activeTool={activeTool}
							onChange={handleToolChange}
							tools={tools}
						/>

						<p className="tool-description">{activeTool.description}</p>

						<label htmlFor="generate-input">{activeTool.input.label}</label>
						<div className="input-row">
							<input
								id="generate-input"
								name="generate-input"
								onChange={(event) => setInput(event.target.value)}
								placeholder={activeTool.placeholder}
								type="text"
								value={input}
							/>
							<button disabled={isLoading} type="submit">
								{isLoading ? "Generateping" : activeTool.display.actionLabel}
							</button>
						</div>
						{activeTool.display.examples.length > 0 ? (
							<div className="examples" aria-label="Examples">
								<span>Try</span>
								{activeTool.display.examples.map((example) => (
									<button
										key={example}
										onClick={() => setInput(example)}
										type="button"
									>
										{example}
									</button>
								))}
							</div>
						) : null}
						{error ? <p className="error">{error}</p> : null}
					</form>
				</div>

				<div className="showcase">
					<img alt="Pashi mascot logo" className="mascot" src="/logo.svg" />
					<ResultStage
						actions={
							result ? (
								<ResultActions
									input={input}
									onClear={() => setResult(undefined)}
									onRegenerate={() => {
										void generateActiveTool();
									}}
									result={result}
									tool={activeTool}
								/>
							) : undefined
						}
						isLoading={isLoading}
						onQrLoad={() => setIsLoading(false)}
						result={result}
					/>
				</div>
			</section>
		</main>
	);
}

function createQrResult(tool: GeneratorInfoTool, payload: string, generateId: number): ResultStageValue {
	const params = new URLSearchParams({
		data: payload,
		format: "png",
		size: QR_SIZE,
		generate: `${generateId}`,
	});

	return {
		alt: `QR code for ${payload}`,
		kind: "qr",
		src: `${tool.endpoint}?${params.toString()}`,
	};
}

function getDefaultInput(tool: GeneratorInfoTool) {
	return tool.input.required ? (tool.display.examples[0] ?? DEFAULT_INPUT) : "";
}

function getRouteToolId() {
	const [toolId] = window.location.pathname.split("/").filter(Boolean);
	return toolId && toolId !== "api" ? toolId : undefined;
}

function pushGeneratorRoute(toolId: string) {
	const nextPath = `/${toolId}`;
	if (window.location.pathname !== nextPath) {
		window.history.pushState(null, "", nextPath);
	}
}
