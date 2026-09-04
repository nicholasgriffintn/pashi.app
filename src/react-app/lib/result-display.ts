import { isRecordArray, isStringArray } from "../../shared/records";
import { isCoinFlipStageResult } from "./coin-result";
import { isDiceStageResult } from "./dice-result";
import type { ResultStageValue, TextResultStageValue } from "./result-types";

export interface RecordPreviewItem {
	label: string;
	value: string;
}

export interface ImagePreviewItem {
	alt: string;
	label: string;
	src: string;
}

const IMAGE_URL_KEYS = [
	"downloadUrl",
	"imageUrl",
	"image",
	"previewUrl",
	"thumbnailUrl",
	"url",
	"src",
] as const;

const RECORD_PREVIEW_KEYS = [
	"hash",
	"value",
	"apiKey",
	"accessToken",
	"token",
	"uuid",
	"cardNumber",
	"number",
	"formatted",
	"name",
	"email",
	"pattern",
	"javascriptLiteral",
	"expression",
] as const;

const IMAGE_OUTPUT_FORMATS = new Set([
	"avif",
	"bmp",
	"gif",
	"ico",
	"jpeg",
	"jpg",
	"mjpeg",
	"png",
	"svg",
	"tif",
	"tiff",
	"webp",
]);

export function textResultDensity(text: string) {
	const lines = text.split("\n");
	const longestLine = lines.reduce((longest, line) => Math.max(longest, line.length), 0);

	if (lines.length === 1 && text.length <= 16) {
		return "short";
	}

	if (lines.length <= 3 && text.length <= 80 && longestLine <= 36) {
		return "medium";
	}

	return "long";
}

export function createRecordPreview(
	records: readonly Record<string, string>[],
): RecordPreviewItem[] {
	const primaryKey = RECORD_PREVIEW_KEYS.find((key) => records.some((record) => record[key]));

	return records.map((record, index) => {
		const value = primaryKey ? record[primaryKey] : firstRecordValue(record);
		const fallbackLabel = `Record ${index + 1}`;
		const label = record.algorithm || record.type || record.format || record.name || fallbackLabel;

		return {
			label: label === value ? fallbackLabel : label,
			value: value || fallbackLabel,
		};
	});
}

export function firstRecordValue(record: Record<string, string>) {
	return Object.values(record).find((value) => value !== "") ?? "";
}

export function createImagePreview(result: TextResultStageValue): ImagePreviewItem[] {
	if (typeof result.result === "string") {
		return imageUrlFromString(result.result)
			? [{ alt: `${result.label} result`, label: result.label, src: result.result }]
			: [];
	}

	if (Array.isArray(result.result)) {
		if (isStringArray(result.result)) {
			return result.result.filter(imageUrlFromString).map((src, index) => ({
				alt: `${result.label} image ${index + 1}`,
				label: imageLabel(src, index),
				src,
			}));
		}

		if (isRecordArray(result.result)) {
			return result.result.flatMap((record, index) => {
				const src = imageUrlFromRecord(record);

				return src
					? [
							{
								alt: `${result.label} image ${index + 1}`,
								label: imageLabel(record.name || record.label || src, index),
								src,
							},
						]
					: [];
			});
		}

		return [];
	}

	const src = imageUrlFromRecord(result.result);

	if (!src || !isImageResultRecord(result.result)) {
		return [];
	}

	return [
		{
			alt: `${result.label} preview`,
			label: result.result.outputFormat ? result.result.outputFormat.toUpperCase() : result.label,
			src,
		},
	];
}

export function imageUrlFromRecord(record: Record<string, string>) {
	for (const key of IMAGE_URL_KEYS) {
		const value = record[key];

		if (value) {
			return value;
		}
	}

	return undefined;
}

export function isImageResultRecord(record: Record<string, string>) {
	return (
		isImageOutputFormat(record.outputFormat || record.format || record.mimeType) ||
		Boolean(imageUrlFromString(imageUrlFromRecord(record) ?? ""))
	);
}

export function isImageOutputFormat(value: string | undefined) {
	if (!value) {
		return false;
	}

	const normalized = value
		.toLowerCase()
		.replace(/^image\//, "")
		.replace(/^.*\./, "");

	return IMAGE_OUTPUT_FORMATS.has(normalized);
}

export function imageUrlFromString(value: string | undefined) {
	if (!value) {
		return undefined;
	}

	try {
		const url = new URL(value, window.location.origin);
		const pathParts = url.pathname.toLowerCase().split(".");
		const extension = pathParts[pathParts.length - 1];

		return extension && IMAGE_OUTPUT_FORMATS.has(extension) ? value : undefined;
	} catch {
		return undefined;
	}
}

export function imageLabel(value: string, index: number) {
	const trimmed = value.trim();

	if (!trimmed) {
		return `Image ${index + 1}`;
	}

	return trimmed.replace(/^.*\//, "") || `Image ${index + 1}`;
}

export function resultTone(result: ResultStageValue | undefined) {
	if (!result) {
		return undefined;
	}

	if (
		result.kind === "image" ||
		result.kind === "palette" ||
		isDiceStageResult(result) ||
		isCoinFlipStageResult(result)
	) {
		return "visual";
	}

	return "code";
}
