interface ConverterEffectPresetControlProps {
	description: string;
	selectedValues: string[];
	onChange: (value: string) => void;
	options: string[];
}

export function ConverterEffectPresetControl({
	description,
	selectedValues,
	onChange,
	options,
}: ConverterEffectPresetControlProps) {
	const normalizedSelectedValues = selectedValues.map((value) => value.trim().toLowerCase());

	function updateEffect(effect: string) {
		const next = new Set(normalizedSelectedValues);
		if (effect === "none") {
			onChange("none");
			return;
		}

		next.delete("none");
		if (next.has(effect)) {
			next.delete(effect);
		} else {
			next.add(effect);
		}
		if (next.size === 0) {
			next.add("none");
		}

		onChange(Array.from(next).join(","));
	}

	return (
		<div className="field-control">
			<span>{description}</span>
			<div className="slackmoji-effect-grid" role="listbox" aria-label="Animation presets">
				{options.map((option) => {
					const isSelected = normalizedSelectedValues.includes(option);
					return (
						<button
							aria-pressed={isSelected}
							className="slackmoji-effect-item"
							key={option}
							type="button"
							onClick={() => updateEffect(option)}
						>
							:{option}:
						</button>
					);
				})}
			</div>
		</div>
	);
}
