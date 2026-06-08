import type { FormEvent } from "react";

import type { GeneratorInfoTool, GeneratorInputField } from "../lib/generator-info";
import { ToolPicker } from "./ToolPicker";

interface GeneratorFormProps {
	activeTool: GeneratorInfoTool;
	error: string;
	fieldValues: Record<string, string>;
	input: string;
	isLoading: boolean;
	onFieldChange: (fieldId: string, value: string) => void;
	onInputChange: (value: string) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onToolChange: (toolId: string) => void;
	tools: GeneratorInfoTool[];
}

export function GeneratorForm({
	activeTool,
	error,
	fieldValues,
	input,
	isLoading,
	onFieldChange,
	onInputChange,
	onSubmit,
	onToolChange,
	tools,
}: GeneratorFormProps) {
	const hasFields = Boolean(activeTool.input.fields?.length);
	const hasPrimaryInput = !hasFields && activeTool.input.mode !== "none";
	const visibleExamples =
		activeTool.input.mode === "none" ? [] : activeTool.display.examples;

	return (
		<form className="generator" onSubmit={onSubmit}>
			<label>Generator</label>
			<ToolPicker activeTool={activeTool} onChange={onToolChange} tools={tools} />

			<p className="tool-description">{activeTool.description}</p>

			{hasFields ? (
				<div className="field-grid">
					{activeTool.input.fields?.map((field) => (
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
						<GenerateButton activeTool={activeTool} isLoading={isLoading} />
					</div>
				</>
			) : (
				<div className="generate-actions">
					<GenerateButton activeTool={activeTool} isLoading={isLoading} />
				</div>
			)}
			{hasFields ? (
				<div className="generate-actions">
					<GenerateButton activeTool={activeTool} isLoading={isLoading} />
				</div>
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
			{error ? <p className="error">{error}</p> : null}
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
		<button disabled={isLoading} type="submit">
			{isLoading ? "Generating" : activeTool.display.actionLabel}
		</button>
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
