import { ConverterOutputControl } from "./ConverterOutputControl";
import { ConverterFieldControl } from "./ConverterFieldControl";
import { type ConverterInfoTool } from "../lib/converter-api";

interface FileConverterControlsProps {
	onFileChange: (file: File | undefined) => void;
	converterFields: Record<string, string>;
	onConverterFieldChange: (id: string, value: string) => void;
	onOutputFormatChange: (value: string) => void;
	outputFormat: string;
	selectedFile?: File;
	tool: ConverterInfoTool;
}

export function FileConverterControls({
	onFileChange,
	converterFields,
	onConverterFieldChange,
	onOutputFormatChange,
	outputFormat,
	selectedFile,
	tool,
}: FileConverterControlsProps) {
	const fields = tool.api?.fields ?? [];
	const outputField = fields.find((field) => field.id === "outputFormat");
	const hasSourcePresetField = fields.some((field) => field.display?.control === "source-presets");

	return (
		<div className="field-grid">
			<label className="field-control">
				<span>{tool.input.label}</span>
				<input
					accept={tool.input.accept?.join(",")}
					onChange={(event) => onFileChange(event.target.files?.[0])}
					required={tool.input.required && !hasSourcePresetField}
					type="file"
				/>
			</label>
			<ConverterOutputControl
				field={outputField}
				onOutputFormatChange={onOutputFormatChange}
				outputFormat={outputFormat}
				tool={tool}
			/>
			{fields.filter((field) => field.id !== "outputFormat").map((field) => (
				<ConverterFieldControl
					key={field.id}
					field={field}
					onChange={(value) => onConverterFieldChange(field.id, value)}
					onFileChange={onFileChange}
					value={converterFields[field.id] ?? ""}
				/>
			))}
			{selectedFile ? (
				<p className="selected-file">
					{selectedFile.name} / {Math.ceil(selectedFile.size / 1024)} KB
				</p>
			) : null}
		</div>
	);
}
