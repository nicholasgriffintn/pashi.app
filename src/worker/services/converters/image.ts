import { json } from "../../utils/http";
import { safeFilename } from "../../utils/text";
import { parsePublicHttpUrl } from "../../utils/urls";
import type { ConverterRequest } from "./types";

export type ImageOutputFormat = "avif" | "jpeg" | "webp";

interface CloudflareImageOptions {
	format: ImageOutputFormat;
	quality?: number;
}

interface ImageFetchInit extends RequestInit {
	cf: {
		image: CloudflareImageOptions;
	};
}

const IMAGE_OUTPUT_FORMATS = new Set<ImageOutputFormat>(["avif", "jpeg", "webp"]);

function sourceName(url: URL) {
	const pathname = url.pathname.split("/").filter(Boolean).at(-1) ?? "image";
	return safeFilename(pathname.replace(/\.[^.]+$/, ""));
}

function normaliseImageFormat(value: string | undefined): ImageOutputFormat | undefined {
	const format = value?.trim().toLowerCase();
	if (format === "jpg") {
		return "jpeg";
	}

	return IMAGE_OUTPUT_FORMATS.has(format as ImageOutputFormat)
		? format as ImageOutputFormat
		: undefined;
}

function parseQuality(value: string | undefined) {
	if (!value) {
		return undefined;
	}

	const quality = Number(value);
	return Number.isInteger(quality) && quality >= 1 && quality <= 100
		? quality
		: undefined;
}

function contentType(format: ImageOutputFormat) {
	return format === "jpeg" ? "image/jpeg" : `image/${format}`;
}

function extension(format: ImageOutputFormat) {
	return format === "jpeg" ? "jpg" : format;
}

export function createImageFormatRequest(request: ConverterRequest) {
	const sourceUrl = parsePublicHttpUrl(request.input);
	if (!sourceUrl) {
		return { error: "Use a public HTTP or HTTPS image URL.", status: 400 as const };
	}

	const requestedFormat = request.fields.outputFormat || request.fields.format;
	const format = normaliseImageFormat(requestedFormat) ?? (!requestedFormat ? "webp" : undefined);
	if (!format) {
		return { error: "Image URL conversion supports webp, jpeg, and avif. Upload a file for other image formats.", status: 400 as const };
	}
	const quality = parseQuality(request.fields.quality);
	const image: CloudflareImageOptions = { format };
	if (quality) {
		image.quality = quality;
	}

	const init: ImageFetchInit = {
		cf: { image },
		headers: {
			Accept: contentType(format),
		},
		redirect: "manual",
	};

	return { format, init, sourceUrl };
}

export async function createImageFormatResponse(request: ConverterRequest) {
	const imageRequest = createImageFormatRequest(request);
	if ("error" in imageRequest) {
		return json({ error: imageRequest.error }, imageRequest.status);
	}

	const response = await fetch(imageRequest.sourceUrl, imageRequest.init);
	if (!response.ok || response.redirected) {
		return json({ error: "Could not fetch and convert that image URL." }, response.status || 502);
	}

	const headers = new Headers(response.headers);
	const outputExtension = extension(imageRequest.format);
	headers.set("Content-Disposition", `attachment; filename="pashi-${sourceName(imageRequest.sourceUrl)}.${outputExtension}"`);
	headers.set("Content-Type", headers.get("Content-Type") || contentType(imageRequest.format));
	headers.set("Cache-Control", "no-store");

	return new Response(response.body, {
		headers,
		status: response.status,
	});
}
