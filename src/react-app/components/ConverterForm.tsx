import { type FormEvent } from "react";

import type { ConverterInfoTool } from "../lib/converter-api";
import { FileConverterControls } from "./FileConverterControls";
import { ConverterOutputControl } from "./ConverterOutputControl";
import { ToolPicker } from "./ToolPicker";

interface ConverterFormProps {
	activeTool: ConverterInfoTool;
	error: string;
	input: string;
	isLoading: boolean;
	converterFields: Record<string, string>;
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

function applyExample(
	example: string,
	onInputChange: (value: string) => void,
) {
	onInputChange(example);
}

function shouldShowOutputControl(tool: ConverterInfoTool) {
	return tool.outputs.length > 1;
}

export function ConverterForm({
	activeTool,
	error,
	converterFields,
	input,
	isLoading,
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
	const visibleExamples = activeTool.input.kind === "text" ? activeTool.display.examples : [];

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
								rows={activeTool.id === "image-format" ? 3 : 9}
								value={input}
							/>
						</label>
						{shouldShowOutputControl(activeTool) ? (
							<ConverterOutputControl
								onOutputFormatChange={onOutputFormatChange}
								outputFormat={outputFormat}
								tool={activeTool}
							/>
						) : null}
					</div>
				) : isAvailable && activeTool.input.kind === "file" ? (
					<FileConverterControls
						converterFields={converterFields}
						input={input}
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

				{visibleExamples.length > 0 ? (
					<div className="examples" aria-label="Examples">
						<span>Try</span>
						{visibleExamples.map((example) => (
							<button
								key={example}
								onClick={() => applyExample(example, onInputChange)}
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
				<button className="primary-action" disabled={isLoading || !isAvailable} type="submit">
					{isLoading ? "Converting" : activeTool.display.actionLabel}
				</button>
			</div>
		</form>
	);
}
