export function parseCommaSeparatedTags(value: string) {
	return [
		...new Set(
			value
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
	];
}

const TRUNCATION_MARK = "…";
const SPLIT_PAIR_END = /[\uD800-\uDBFF]$/;
const SPLIT_PAIR_START = /^[\uDC00-\uDFFF]/;

export function truncateEnd(value: string, maxLength: number, mark = TRUNCATION_MARK) {
	if (value.length <= maxLength) {
		return value;
	}

	const kept = value.slice(0, Math.max(0, maxLength - mark.length));

	return `${kept.replace(SPLIT_PAIR_END, "")}${mark}`;
}

export function truncateStart(value: string, maxLength: number, mark = TRUNCATION_MARK) {
	if (value.length <= maxLength) {
		return value;
	}

	const kept = value.slice(value.length - Math.max(0, maxLength - mark.length));

	return `${mark}${kept.replace(SPLIT_PAIR_START, "")}`;
}
