export function escapeXml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;")
		.replaceAll("'", "&apos;");
}

export function safeFilename(value: string) {
	return value.replace(/[^a-z0-9_-]/gi, "-").toLowerCase() || "pashi";
}

export function todayIsoDate() {
	return new Date().toISOString().slice(0, 10);
}
