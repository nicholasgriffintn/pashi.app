const RESIZE_STEPS = [2048, 1600, 1280, 1024, 768, 512];
const ENCODE_TYPE = "image/webp";
const ENCODE_QUALITY = 0.85;

export function dataUrlBytes(dataUrl: string) {
	const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
	const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;

	return Math.floor((base64.length * 3) / 4) - padding;
}

function readFileAsDataUrl(file: Blob) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();

		reader.addEventListener("load", () => {
			if (typeof reader.result === "string") {
				resolve(reader.result);
			} else {
				reject(new Error("That image could not be read."));
			}
		});
		reader.addEventListener("error", () => reject(new Error("That image could not be read.")));
		reader.readAsDataURL(file);
	});
}

function encodeResized(bitmap: ImageBitmap, maxDimension: number) {
	const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement("canvas");

	canvas.width = Math.max(1, Math.round(bitmap.width * scale));
	canvas.height = Math.max(1, Math.round(bitmap.height * scale));

	const context = canvas.getContext("2d");

	if (!context) {
		throw new Error("This browser cannot resize images.");
	}

	context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

	return canvas.toDataURL(ENCODE_TYPE, ENCODE_QUALITY);
}

export async function readImageWithinBudget(
	file: File,
	mimeTypes: readonly string[],
	maxBytes: number,
) {
	if (mimeTypes.includes(file.type) && file.size <= maxBytes) {
		return readFileAsDataUrl(file);
	}

	const bitmap = await createImageBitmap(file).catch(() => {
		throw new Error("Pick a JPEG, PNG or WebP image.");
	});

	try {
		for (const dimension of RESIZE_STEPS) {
			const dataUrl = encodeResized(bitmap, dimension);
			const mimeType = dataUrl.slice(5, dataUrl.indexOf(";"));

			if (mimeTypes.includes(mimeType) && dataUrlBytes(dataUrl) <= maxBytes) {
				return dataUrl;
			}
		}
	} finally {
		bitmap.close();
	}

	throw new Error(`That image will not shrink under ${maxBytes / 1024 / 1024} MiB.`);
}
