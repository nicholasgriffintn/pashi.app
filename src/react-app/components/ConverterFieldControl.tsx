import type { ConverterApiField } from "../lib/converter-api";

import { ConverterEffectPresetControl } from "./ConverterEffectPresetControl";
import { ConverterSourcePresetControl } from "./ConverterSourcePresetControl";

interface ConverterFieldControlProps {
	field: ConverterApiField;
	onChange: (value: string) => void;
	onFileChange?: (file: File | undefined) => void;
	value: string;
}

function fieldControlClassName(field: ConverterApiField) {
	return field.display?.width === "full" ? "field-control field-control-full" : "field-control";
}

export function ConverterFieldControl({
	field,
	onChange,
	onFileChange,
	value,
}: ConverterFieldControlProps) {
	if (field.display?.control === "source-presets") {
		return (
			<div className={fieldControlClassName(field)}>
				<ConverterSourcePresetControl
					field={field}
					onChange={onChange}
					onFileChange={onFileChange}
					selectedSourceKey={value}
				/>
			</div>
		);
	}

	if (field.display?.control === "effect-presets" && field.values && field.values.length > 0) {
		const selected = value
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);

		return (
			<ConverterEffectPresetControl
				className={fieldControlClassName(field)}
				description={field.description}
				options={field.values}
				onChange={onChange}
				selectedValues={selected}
			/>
		);
	}

	if (field.values && field.values.length > 0) {
		return (
			<label className={fieldControlClassName(field)}>
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
		<label className={fieldControlClassName(field)}>
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
