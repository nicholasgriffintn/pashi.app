import type { ConverterApiField, ConverterInfoTool } from "../lib/converter-api";

interface ConverterOutputControlProps {
	field?: ConverterApiField;
	onOutputFormatChange: (value: string) => void;
	outputFormat: string;
	tool: ConverterInfoTool;
}

function supportsCustomOutputFormat(tool: ConverterInfoTool) {
	return tool.runtime === "container" && tool.input.kind === "file";
}

export function ConverterOutputControl({
	field,
	onOutputFormatChange,
	outputFormat,
	tool,
}: ConverterOutputControlProps) {
	const className = field?.display?.width === "full" ? "field-control field-control-full" : "field-control";

	if (supportsCustomOutputFormat(tool)) {
		const listId = `${tool.id}-output-formats`;

		return (
			<label className={className}>
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
		<label className={className}>
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
