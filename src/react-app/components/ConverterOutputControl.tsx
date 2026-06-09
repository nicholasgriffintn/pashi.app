import type { ConverterApiField, ConverterInfoTool } from "../lib/converter-api";

interface ConverterOutputControlProps {
	field?: ConverterApiField;
	onOutputFormatChange: (value: string) => void;
	outputFormat: string;
	tool: ConverterInfoTool;
}

export function ConverterOutputControl({
	field,
	onOutputFormatChange,
	outputFormat,
	tool,
}: ConverterOutputControlProps) {
	const className = field?.display?.width === "full" ? "field-control field-control-full" : "field-control";

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
