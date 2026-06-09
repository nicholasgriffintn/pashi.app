import type { ConverterApiField } from "../lib/converter-api";

import { ConverterEffectPresetControl } from "./ConverterEffectPresetControl";

interface ConverterFieldControlProps {
	actionToolId: string;
	field: ConverterApiField;
	onChange: (value: string) => void;
	value: string;
}

export function ConverterFieldControl({
	actionToolId,
	field,
	onChange,
	value,
}: ConverterFieldControlProps) {
	if (actionToolId === "slackmoji" && field.id === "effect" && field.values && field.values.length > 0) {
		const selected = value
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);

		return (
			<ConverterEffectPresetControl
				description={field.description}
				options={field.values}
				onChange={onChange}
				selectedValues={selected}
			/>
		);
	}

	if (field.values && field.values.length > 0) {
		return (
			<label className="field-control">
				<span>{field.description}</span>
				<select
					onChange={(event) => onChange(event.target.value)}
					required={Boolean(field.required)}
					value={value || field.values[0]}
				>
					{field.values.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			</label>
		);
	}

	return (
		<label className="field-control">
			<span>{field.description}</span>
			<input
				onChange={(event) => onChange(event.target.value)}
				required={Boolean(field.required)}
				type="text"
				value={value}
			/>
		</label>
	);
}
