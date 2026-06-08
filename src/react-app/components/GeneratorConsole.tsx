import { type FormEvent, useEffect, useState } from "react";

import { generateThing, type GenerateResult } from "../lib/generate-api";
import {
	fetchGeneratorInfo,
	getFallbackTool,
	type GeneratorInfoTool,
} from "../lib/generator-info";
import { ResultStage } from "./ResultStage";

const DEFAULT_INPUT = "https://pashi.app";
const QR_SIZE = "360x360";

type ResultValue =
	| GenerateResult
	| {
		alt: string;
		kind: "qr";
		src: string;
	};

export function GeneratorConsole() {
	const [tools, setTools] = useState<GeneratorInfoTool[]>([getFallbackTool()]);
	const [activeToolId, setActiveToolId] = useState("qr");
	const [input, setInput] = useState(DEFAULT_INPUT);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [snapId, setSnapId] = useState(0);
	const [result, setResult] = useState<ResultValue>(() =>
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

				setTools(info.tools);
				setActiveToolId(info.tools[0].id);
				setResult(createQrResult(info.tools[0], DEFAULT_INPUT, 0));
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
		setError("");
		setIsLoading(true);

		if (activeTool.result.kind === "image") {
			const payload = input.trim();
			if (!payload) {
				setError("Give Pashi something to snap.");
				setIsLoading(false);
				return;
			}

			const nextSnapId = snapId + 1;
			setSnapId(nextSnapId);
			setResult(createQrResult(activeTool, payload, nextSnapId));
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
		setInput(nextTool.input.required ? DEFAULT_INPUT : "");
		setError("");
	}

	return (
		<main className="shell">
			<section className="hero" aria-labelledby="pashi-title">
				<div className="copy">
					<h1 id="pashi-title">Pashi</h1>
					<p className="intro">Generate useful little things in a snap.</p>

					<form className="generator" onSubmit={handleSubmit}>
						<label htmlFor="tool">Generator</label>
						<select
							id="tool"
							onChange={(event) => handleToolChange(event.target.value)}
							value={activeToolId}
						>
							{tools.map((tool) => (
								<option key={tool.id} value={tool.id}>
									{tool.label} - {tool.audience}
								</option>
							))}
						</select>

						<p className="tool-description">{activeTool.description}</p>

						<label htmlFor="snap-input">{activeTool.input.label}</label>
						<div className="input-row">
							<input
								id="snap-input"
								name="snap-input"
								onChange={(event) => setInput(event.target.value)}
								placeholder={activeTool.placeholder}
								type="text"
								value={input}
							/>
							<button disabled={isLoading} type="submit">
								{isLoading ? "Snapping" : "Snap"}
							</button>
						</div>
						{error ? <p className="error">{error}</p> : null}
					</form>
				</div>

				<div className="showcase">
					<img alt="Pashi mascot logo" className="mascot" src="/logo.svg" />
					<ResultStage
						isLoading={isLoading}
						onQrLoad={() => setIsLoading(false)}
						result={result}
					/>
				</div>
			</section>
		</main>
	);
}

function createQrResult(tool: GeneratorInfoTool, payload: string, snapId: number): ResultValue {
	const params = new URLSearchParams({
		data: payload,
		format: "png",
		size: QR_SIZE,
		snap: `${snapId}`,
	});

	return {
		alt: `QR code for ${payload}`,
		kind: "qr",
		src: `${tool.endpoint}?${params.toString()}`,
	};
}
