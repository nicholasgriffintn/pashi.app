import type { FormEvent } from "react";

import type { GeneratorInfoTool, GeneratorInputField } from "../lib/generator-info";
import { ToolPicker } from "./ToolPicker";

type GenerationMode = "ai" | "standard";

interface GeneratorFormProps {
	activeTool: GeneratorInfoTool;
	error: string;
	fieldValues: Record<string, string>;
	generationMode: GenerationMode;
	input: string;
	isLoading: boolean;
	onFieldChange: (fieldId: string, value: string) => void;
	onGenerationModeChange: (mode: GenerationMode) => void;
	onInputChange: (value: string) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onToolChange: (toolId: string) => void;
	tools: GeneratorInfoTool[];
}

function applyExample(
	tool: GeneratorInfoTool,
	example: string,
	onInputChange: (value: string) => void,
	onFieldChange: (fieldId: string, value: string) => void,
) {
	const firstField = tool.input.fields?.[0];
	if (!firstField) {
		onInputChange(example);
		return;
	}

	onFieldChange(firstField.id, example);
}

function shouldShowField(toolId: string, fieldId: string, fieldValues: Record<string, string>) {
	if (toolId !== "uuid") {
		return true;
	}

	if (fieldId !== "name" && fieldId !== "namespace") {
		return true;
	}

	const format = fieldValues.format || "v4";
	return format === "v3" || format === "v5";
}

export function GeneratorForm({
	activeTool,
	error,
	fieldValues,
	generationMode,
	input,
	isLoading,
	onFieldChange,
	onGenerationModeChange,
	onInputChange,
	onSubmit,
	onToolChange,
	tools,
}: GeneratorFormProps) {
	const hasFields = Boolean(activeTool.input.fields?.length);
	const hasPrimaryInput = !hasFields && activeTool.input.mode !== "none";
	const visibleExamples =
		activeTool.input.mode === "none" ? [] : activeTool.display.examples;
	const visibleFields = activeTool.input.fields?.filter((field) => shouldShowField(activeTool.id, field.id, fieldValues));
	const supportsAiMode = activeTool.modes?.includes("ai") ?? false;

	return (
		<form className="generator" onSubmit={onSubmit}>
			<div className="generator-content">
				<label>Generator</label>
				<ToolPicker
					activeTool={activeTool}
					label="generators"
					onChange={onToolChange}
					recentKey="pashi:recent-generator-tools"
					tools={tools}
				/>

				<p className="tool-description">{activeTool.description}</p>

				{hasFields ? (
					<div className="field-grid">
						{visibleFields?.map((field) => (
							<label className="field-control" key={field.id}>
								<span>{field.label}</span>
								<FieldInput
									field={field}
									onChange={(value) => onFieldChange(field.id, value)}
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
								onChange={(event) => onInputChange(event.target.value)}
								placeholder={activeTool.placeholder}
								type="text"
								value={input}
							/>
						</div>
					</>
				) : null}

				{visibleExamples.length > 0 ? (
					<div className="examples" aria-label="Examples">
						<span>Try</span>
						{visibleExamples.map((example) => (
							<button
								key={example}
								onClick={() => applyExample(activeTool, example, onInputChange, onFieldChange)}
								type="button"
							>
								{example}
							</button>
						))}
					</div>
				) : null}
			</div>

			<div className="generate-actions">
				{error ? <p className="error">{error}</p> : null}
				{supportsAiMode ? (
					<GenerationModeToggle
						mode={generationMode}
						onChange={onGenerationModeChange}
					/>
				) : null}
				<GenerateButton
					activeTool={activeTool}
					isLoading={isLoading}
				/>
			</div>
		</form>
	);
}

function GenerateButton({
	activeTool,
	isLoading,
}: {
	activeTool: GeneratorInfoTool;
	isLoading: boolean;
}) {
	return (
		<button className="primary-action" disabled={isLoading} type="submit">
			{isLoading ? "Generating" : activeTool.display.actionLabel}
		</button>
	);
}

function GenerationModeToggle({
	mode,
	onChange,
}: {
	mode: GenerationMode;
	onChange: (mode: GenerationMode) => void;
}) {
	return (
		<div className="mode-control">
			<span id="generation-mode-label">Mode</span>
			<div aria-labelledby="generation-mode-label" className="mode-toggle" role="group">
				<button
					aria-pressed={mode === "standard"}
					onClick={() => onChange("standard")}
					type="button"
				>
					Standard
				</button>
				<button
					aria-pressed={mode === "ai"}
					onClick={() => onChange("ai")}
					type="button"
				>
					AI
				</button>
			</div>
		</div>
	);
}

function FieldInput({
	field,
	onChange,
	value,
}: {
	field: GeneratorInputField;
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
