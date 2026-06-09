import type { ConverterApiField } from "../lib/converter-api";
import { useSlackmojiPresets } from "../lib/use-slackmoji-presets";

interface ConverterSourcePresetControlProps {
	field: ConverterApiField;
	onChange: (value: string) => void;
	onFileChange?: (file: File | undefined) => void;
	selectedSourceKey: string;
}

export function ConverterSourcePresetControl({
	field,
	onChange,
	onFileChange,
	selectedSourceKey,
}: ConverterSourcePresetControlProps) {
	const { error, isLoading, presets } = useSlackmojiPresets(true);
	const selectedPreset = presets.find((preset) => preset.key === selectedSourceKey);

	return (
		<div className="slackmoji-preset-control">
			<div className="slackmoji-preset-copy">
				<span>{field.description}</span>
				<p className="slackmoji-preset-status">
					{error
						? error
						: isLoading
							? "Loading presets..."
							: selectedSourceKey
								? `Using preset: ${selectedPreset?.name ?? selectedSourceKey}`
								: presets.length > 0
									? "Choose one of the built-in images."
									: "No presets available."}
				</p>
			</div>
			<div className="slackmoji-preset-grid">
				{presets.map((preset) => {
					const isSelected = selectedSourceKey === preset.key;
					return (
						<button
							aria-pressed={isSelected}
							className="slackmoji-preset-item"
							key={preset.key}
							onClick={() => {
								onFileChange?.(undefined);
								onChange(isSelected ? "" : preset.key);
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
		</div>
	);
}
