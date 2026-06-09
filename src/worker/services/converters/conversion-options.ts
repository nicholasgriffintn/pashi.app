const CONVERSION_OPERATION_FIELD_IDS = [
	"bitrate",
	"channels",
	"duration",
	"effect",
	"fps",
	"height",
	"operation",
	"sampleRate",
	"speed",
	"time",
	"volume",
	"width",
] as const;

const SAFE_CONVERSION_FIELD_PATTERN = /^[\w:.,%+\- /]+$/;

function normaliseEffectToken(value: string) {
	return value.trim().toLowerCase().replace(/^:+/, "").replace(/:+$/, "");
}

export type ConversionOperationFields = Partial<Record<(typeof CONVERSION_OPERATION_FIELD_IDS)[number], string>>;

export function createConversionOperationFields(fields: Record<string, string>): ConversionOperationFields {
	const operationFields: ConversionOperationFields = {};
	for (const key of CONVERSION_OPERATION_FIELD_IDS) {
		const value = fields[key]?.trim();
		if (!value) {
			continue;
		}

		if (key === "effect") {
			const effects = value
				.split(",")
				.map((effect) => normaliseEffectToken(effect))
				.filter(Boolean);
			const selectedEffect = effects.find((effect) => effect !== "none") ?? effects[0];
			if (selectedEffect && SAFE_CONVERSION_FIELD_PATTERN.test(selectedEffect)) {
				operationFields.effect = selectedEffect;
			}
			continue;
		}

		if (SAFE_CONVERSION_FIELD_PATTERN.test(value)) {
			operationFields[key] = value;
		}
	}

	return operationFields;
}

export function appendConversionOperationSearchParams(url: URL, fields: ConversionOperationFields) {
	for (const [key, value] of Object.entries(fields)) {
		if (value) {
			url.searchParams.set(key, value);
		}
	}
}
