import { ConverterOutputControl } from "./ConverterOutputControl";
import { ConverterFieldControl } from "./ConverterFieldControl";
import { useSlackmojiPresets } from "../lib/use-slackmoji-presets";
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
	const selectedSourceKey = converterFields.sourceKey ?? "";
	const isSlackmoji = tool.id === "slackmoji";
	const { error: presetError, isLoading: isPresetLoading, presets } = useSlackmojiPresets(tool.id);
	const selectedPreset = presets.find((preset) => preset.key === selectedSourceKey);

	return (
		<div className="field-grid">
			<label className="field-control">
				<span>{tool.input.label}</span>
				<input
					accept={tool.input.accept?.join(",")}
					onChange={(event) => onFileChange(event.target.files?.[0])}
					required={tool.input.required && !isSlackmoji}
					type="file"
				/>
			</label>
			{isSlackmoji ? (
				<div className="field-control">
					<span>Source preset</span>
					<p className="slackmoji-preset-status">
						{presetError
							? presetError
							: isPresetLoading
								? "Loading presets..."
								: selectedSourceKey
									? `Using preset: ${selectedPreset?.name ?? selectedSourceKey}`
									: presets.length > 0
										? "Or choose a preset from the gallery"
										: "No presets available."}
					</p>
				</div>
			) : null}
			<ConverterOutputControl
				onOutputFormatChange={onOutputFormatChange}
				outputFormat={outputFormat}
				tool={tool}
			/>
			{tool.api?.fields?.filter((field) => field.id !== "outputFormat" && field.id !== "sourceKey").map((field) => (
				<ConverterFieldControl
					key={field.id}
					actionToolId={tool.id}
					field={field}
					onChange={(value) => onConverterFieldChange(field.id, value)}
					value={converterFields[field.id] ?? ""}
				/>
			))}
			{isSlackmoji ? (
				<div className="slackmoji-preset-grid">
					{presets.map((preset) => {
						const isSelected = selectedSourceKey === preset.key;
						return (
							<button
								aria-pressed={isSelected}
								className="slackmoji-preset-item"
								key={preset.key}
								onClick={() => {
									onFileChange(undefined);
									onConverterFieldChange("sourceKey", isSelected ? "" : preset.key);
								}}
								type="button"
							>
								<img
									alt={preset.name}
									src={preset.url}
								/>
								<span>{preset.name}</span>
							</button>
						);
					})}
				</div>
			) : null}
			{selectedFile ? (
				<p className="selected-file">
					{selectedFile.name} / {Math.ceil(selectedFile.size / 1024)} KB
				</p>
			) : null}
		</div>
	);
}
