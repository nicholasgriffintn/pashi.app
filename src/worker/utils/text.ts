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

export function fileExtension(value: string) {
	const match = value.toLowerCase().match(/\.([a-z0-9]{1,8})$/);

	return match ? match[1] : "";
}

export function safeFilenameWithExtension(value: string) {
	const extension = fileExtension(value);
	const stem = safeFilename(extension ? value.slice(0, -(extension.length + 1)) : value);

	return extension ? `${stem}.${extension}` : stem;
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

export function serialiseJsonForHtml(value: unknown) {
	return JSON.stringify(value)
		.replace(/</g, "\\u003c")
		.replace(/>/g, "\\u003e")
		.replace(/&/g, "\\u0026")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");
}
