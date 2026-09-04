export function buildShareSearch(input: string, fields: Record<string, string>) {
	const params = new URLSearchParams();

	if (input.trim()) {
		params.set("input", input);
	}

	for (const [key, value] of Object.entries(fields)) {
		if (value.trim()) {
			params.set(key, value);
		}
	}

	return params.toString();
}

export function shareUrlFor(pathname: string, input: string, fields: Record<string, string>) {
	const search = buildShareSearch(input, fields);
	const origin = typeof window === "undefined" ? "https://pashi.app" : window.location.origin;

	return search ? `${origin}${pathname}?${search}` : `${origin}${pathname}`;
}
