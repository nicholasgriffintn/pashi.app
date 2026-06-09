import type { FormEvent } from "react";

import type { ConverterInfoTool } from "../lib/converter-api";
import { ToolPicker } from "./ToolPicker";

interface ConverterFormProps {
	activeTool: ConverterInfoTool;
	error: string;
	input: string;
	isLoading: boolean;
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

function supportsCustomOutputFormat(tool: ConverterInfoTool) {
	return tool.runtime === "container" && tool.input.kind === "file";
}

export function ConverterForm({
	activeTool,
	error,
	input,
	isLoading,
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
					onFileChange={onFileChange}
					onOutputFormatChange={onOutputFormatChange}
					outputFormat={outputFormat}
					selectedFile={selectedFile}
					tool={activeTool}
				/>
			) : (
				<p className="error">{activeTool.label} is not available.</p>
			)}

			<div className="generate-actions">
				<button disabled={isLoading || !isAvailable} type="submit">
					{isLoading ? "Converting" : activeTool.display.actionLabel}
				</button>
			</div>

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
			{error ? <p className="error">{error}</p> : null}
		</form>
	);
}

function ConverterOutputControl({
	onOutputFormatChange,
	outputFormat,
	tool,
}: {
	onOutputFormatChange: (value: string) => void;
	outputFormat: string;
	tool: ConverterInfoTool;
}) {
	if (supportsCustomOutputFormat(tool)) {
		const listId = `${tool.id}-output-formats`;

		return (
			<label className="field-control">
				<span>Output</span>
				<input
					list={listId}
					onChange={(event) => onOutputFormatChange(event.target.value)}
					pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,31}"
					placeholder={tool.outputs[0] ?? "mp4"}
					required
					title="Use an ffmpeg output extension such as webp, tiff, mp4, flac, or mp3."
					value={outputFormat}
				/>
				<datalist id={listId}>
					{tool.outputs.map((output) => (
						<option key={output} value={output}>
							{output.toUpperCase()}
						</option>
					))}
				</datalist>
			</label>
		);
	}

	return (
		<label className="field-control">
			<span>Output</span>
			<select
				onChange={(event) => onOutputFormatChange(event.target.value)}
				required
				value={outputFormat}
			>
				{tool.outputs.map((output) => (
					<option key={output} value={output}>
						{output.toUpperCase()}
					</option>
				))}
			</select>
		</label>
	);
}

function FileConverterControls({
	onFileChange,
	onOutputFormatChange,
	outputFormat,
	selectedFile,
	tool,
}: {
	onFileChange: (file: File | undefined) => void;
	onOutputFormatChange: (value: string) => void;
	outputFormat: string;
	selectedFile?: File;
	tool: ConverterInfoTool;
}) {
	return (
		<div className="field-grid">
			<label className="field-control">
				<span>{tool.input.label}</span>
				<input
					accept={tool.input.accept?.join(",")}
					onChange={(event) => onFileChange(event.target.files?.[0])}
					required={tool.input.required}
					type="file"
				/>
			</label>
			<ConverterOutputControl
				onOutputFormatChange={onOutputFormatChange}
				outputFormat={outputFormat}
				tool={tool}
			/>
			{selectedFile ? (
				<p className="selected-file">
					{selectedFile.name} / {Math.ceil(selectedFile.size / 1024)} KB
				</p>
			) : null}
		</div>
	);
}
