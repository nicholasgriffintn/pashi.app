export function escapeXml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function safeFilename(value: string) {
	return value.replace(/[^a-z0-9_-]/gi, "-").toLowerCase() || "pashi";
}

export function safeHttpUrl(value: string | undefined) {
	if (!value?.trim()) {
		return undefined;
	}

	try {
		const url = new URL(value.trim());
		return url.protocol === "http:" || url.protocol === "https:" ? value.trim() : undefined;
	} catch {
		return undefined;
	}
}

export function todayIsoDate() {
	return new Date().toISOString().slice(0, 10);
}
