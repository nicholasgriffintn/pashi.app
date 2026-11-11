import type { FormEvent } from "react";

import type { ToolExample } from "../../shared/tool-examples";
import type { ConverterInfoTool } from "../lib/converter-api";
import {
	converterExamplesForMode,
	converterModeField,
	visibleConverterFields,
} from "../lib/converter-state";
import { ConverterFieldControl } from "./ConverterFieldControl";
import { ConverterOutputControl } from "./ConverterOutputControl";
import { FileConverterControls } from "./FileConverterControls";
import { ToolExamples } from "./ToolExamples";
import { ToolPicker } from "./ToolPicker";

interface ConverterFormProps {
	activeTool: ConverterInfoTool;
	error: string;
	input: string;
	isLoading: boolean;
	converterFields: Record<string, string>;
	onApplyExample: (example: ToolExample) => void;
	onConverterFieldChange: (id: string, value: string) => void;
	onFileChange: (file: File | undefined) => void;
	onInputChange: (value: string) => void;
	onOutputFormatChange: (value: string) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onToolChange: (toolId: string) => void;
	outputFormat: string;
	selectedFile?: File;
	tools: ConverterInfoTool[];
}

export function ConverterForm({
	activeTool,
	error,
	converterFields,
	input,
	isLoading,
	onApplyExample,
	onConverterFieldChange,
	onFileChange,
	onInputChange,
	onOutputFormatChange,
	onSubmit,
	onToolChange,
	outputFormat,
	selectedFile,
	tools,
}: ConverterFormProps) {
	const isAvailable = activeTool.status === "available";
	const values = { fields: converterFields, input, outputFormat };
	const modeField = converterModeField(activeTool);

	return (
		<form className="generator converter-panel" onSubmit={onSubmit}>
			<div className="generator-content">
				<label>Converter</label>
				<ToolPicker
					activeTool={activeTool}
					label="converters"
					onChange={onToolChange}
					recentKey="pashi:recent-converter-tools"
					tools={tools}
				/>

				<p className="tool-description">{activeTool.description}</p>

				{isAvailable && activeTool.input.kind === "text" ? (
					<div className="field-grid">
						<label className="field-control converter-input">
							<span>{activeTool.input.label}</span>
							<textarea
								onChange={(event) => onInputChange(event.target.value)}
								placeholder={activeTool.placeholder}
								required={activeTool.input.required}
								rows={activeTool.capabilities?.compactInput ? 3 : 9}
								value={input}
							/>
						</label>
						{modeField && activeTool.outputs.length > 1 ? (
							<ConverterOutputControl
								field={modeField}
								onOutputFormatChange={onOutputFormatChange}
								outputFormat={outputFormat}
								tool={activeTool}
							/>
						) : null}
						{visibleConverterFields(activeTool, values).map((field) => (
							<ConverterFieldControl
								key={field.id}
								field={field}
								onChange={(value) => onConverterFieldChange(field.id, value)}
								value={converterFields[field.id] ?? ""}
							/>
						))}
					</div>
				) : isAvailable && activeTool.input.kind === "file" ? (
					<FileConverterControls
						converterFields={converterFields}
						input={input}
						onApplyExample={onApplyExample}
						onConverterFieldChange={onConverterFieldChange}
						onFileChange={onFileChange}
						onInputChange={onInputChange}
						onOutputFormatChange={onOutputFormatChange}
						outputFormat={outputFormat}
						selectedFile={selectedFile}
						tool={activeTool}
					/>
				) : (
					<p className="error">{activeTool.label} is not available.</p>
				)}

				{isAvailable && activeTool.input.kind === "text" ? (
					<ToolExamples
						examples={converterExamplesForMode(activeTool, outputFormat)}
						label="Try"
						onApply={onApplyExample}
					/>
				) : null}
			</div>

			<div className="generate-actions">
				{error ? <p className="error">{error}</p> : null}
				<button className="primary-action" disabled={isLoading || !isAvailable} type="submit">
					{isLoading ? "Converting" : activeTool.display.actionLabel}
				</button>
			</div>
		</form>
	);
}
