export function formatCompactCount(value: number) {
	if (!Number.isFinite(value) || value < 0) {
		return "0";
	}

	if (value >= 1_000_000) {
		const millions = value / 1_000_000;

		return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
	}

	if (value >= 1_000) {
		return `${Math.round(value / 1_000)}k`;
	}

	return String(Math.round(value));
}
