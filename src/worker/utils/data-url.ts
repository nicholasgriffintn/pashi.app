const BASE64_DATA_URL = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/;

export interface Base64DataUrl {
	bytes: number;
	dataUrl: string;
	mimeType: string;
}

export function readBase64DataUrl(
	value: unknown,
	mimeTypes: readonly string[],
): Base64DataUrl | undefined {
	const match = typeof value === "string" ? BASE64_DATA_URL.exec(value) : null;

	if (!match || !mimeTypes.includes(match[1])) {
		return undefined;
	}

	const padding = match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0;

	return {
		bytes: Math.floor((match[2].length * 3) / 4) - padding,
		dataUrl: match[0],
		mimeType: match[1],
	};
}
