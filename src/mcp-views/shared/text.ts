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
