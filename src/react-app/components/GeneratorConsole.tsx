import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useState } from "react";

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
	const [exportFormats, setExportFormats] = useState<string[]>([]);
	const [activeToolId, setActiveToolId] = useState(getRouteToolId() ?? "qr");
	const [input, setInput] = useState(DEFAULT_INPUT);
	const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [generateId, setGenerateId] = useState(0);
	const [result, setResult] = useState<ResultStageValue | undefined>(() =>
		createImageResult(getFallbackTool(), DEFAULT_INPUT, {}, 0),
	);

	const activeTool = tools.find((tool) => tool.id === activeToolId) ?? tools[0];
	const hasFields = Boolean(activeTool.input.fields?.length);
	const hasPrimaryInput = !hasFields && activeTool.input.mode !== "none";
	const visibleExamples = activeTool.input.mode === "none" ? [] : activeTool.display.examples;
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
		const nextTool = tools.find((tool) => tool.id === nextToolId) ?? tools[0];
		setActiveToolId(nextToolId);
		setInput(getDefaultInput(nextTool));
		setFieldValues(getDefaultFieldValues(nextTool));
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

						{hasFields ? (
							<div className="field-grid">
								{activeTool.input.fields?.map((field) => (
									<label className="field-control" key={field.id}>
										<span>{field.label}</span>
										<FieldInput
											field={field}
											onChange={(value) =>
												setFieldValues((current) => ({
													...current,
													[field.id]: value,
												}))
											}
											value={fieldValues[field.id] ?? ""}
										/>
									</label>
								))}
							</div>
						) : hasPrimaryInput ? (
							<>
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
										{isLoading ? "Generating" : activeTool.display.actionLabel}
									</button>
								</div>
							</>
						) : (
							<div className="generate-actions">
								<button disabled={isLoading} type="submit">
									{isLoading ? "Generating" : activeTool.display.actionLabel}
								</button>
							</div>
						)}
						{hasFields ? (
							<div className="generate-actions">
								<button disabled={isLoading} type="submit">
									{isLoading ? "Generating" : activeTool.display.actionLabel}
								</button>
							</div>
						) : null}
						{visibleExamples.length > 0 ? (
							<div className="examples" aria-label="Examples">
								<span>Try</span>
								{visibleExamples.map((example) => (
									<button
										key={example}
										onClick={() => applyExample(activeTool, example, setInput, setFieldValues)}
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
									exportFormats={exportFormats}
									fields={fieldValues}
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

function createImageResult(
	tool: GeneratorInfoTool,
	input: string,
	fields: Record<string, string>,
	generateId: number,
): ResultStageValue {
	const params = new URLSearchParams({
		generate: `${generateId}`,
	});

	if (tool.id === "qr") {
		params.set("data", input);
		params.set("format", "png");
		params.set("size", QR_SIZE);
	} else {
		if (input) {
			params.set("input", input);
		}
		for (const [key, value] of Object.entries(fields)) {
			if (value) {
				params.set(key, value);
			}
		}
	}

	return {
		alt: `${tool.label} result`,
		kind: "image",
		src: `${tool.endpoint}?${params.toString()}`,
	};
}

function getDefaultInput(tool: GeneratorInfoTool) {
	if (tool.input.mode === "none" || tool.input.fields?.length) {
		return "";
	}

	return tool.input.required ? (tool.display.examples[0] ?? DEFAULT_INPUT) : "";
}

function getDefaultFieldValues(tool: GeneratorInfoTool) {
	return Object.fromEntries(
		(tool.input.fields ?? []).map((field) => [field.id, field.placeholder]),
	);
}

function getInitialValues(tool: GeneratorInfoTool) {
	const params = new URLSearchParams(window.location.search);
	const input = params.get("input") ?? params.get("data") ?? getDefaultInput(tool);
	const fields = {
		...getDefaultFieldValues(tool),
		...Object.fromEntries(
			(tool.input.fields ?? []).flatMap((field) => {
				const value = params.get(field.id);
				return value === null ? [] : [[field.id, value]];
			}),
		),
	};

	return { fields, input };
}

function FieldInput({
	field,
	onChange,
	value,
}: {
	field: NonNullable<GeneratorInfoTool["input"]["fields"]>[number];
	onChange: (value: string) => void;
	value: string;
}) {
	if (field.type === "textarea") {
		return (
			<textarea
				onChange={(event) => onChange(event.target.value)}
				placeholder={field.placeholder}
				required={field.required}
				rows={4}
				value={value}
			/>
		);
	}

	if (field.type === "select" && field.options?.length) {
		return (
			<select
				onChange={(event) => onChange(event.target.value)}
				required={field.required}
				value={value}
			>
				{field.options.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		);
	}

	return (
		<input
			onChange={(event) => onChange(event.target.value)}
			placeholder={field.placeholder}
			required={field.required}
			type="text"
			value={value}
		/>
	);
}

function applyExample(
	tool: GeneratorInfoTool,
	example: string,
	setInput: (value: string) => void,
	setFieldValues: Dispatch<SetStateAction<Record<string, string>>>,
) {
	const firstField = tool.input.fields?.[0];
	if (!firstField) {
		setInput(example);
		return;
	}

	setFieldValues((current) => ({ ...current, [firstField.id]: example }));
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
