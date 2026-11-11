export type FileSignatureKind = "archive" | "audio" | "binary" | "document" | "image";

export interface FileSignature {
	extension: string;
	kind: FileSignatureKind;
	mimeType: string;
	name: string;
}

const UNKNOWN_SIGNATURE: FileSignature = {
	extension: "unknown",
	kind: "binary",
	mimeType: "application/octet-stream",
	name: "Unknown binary data",
};

const HEIF_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"]);
const AVIF_BRANDS = new Set(["avif", "avis"]);
const BMP_HEADER_SIZES = new Set([12, 40, 52, 56, 64, 108, 124]);
const SVG_SCAN_LENGTH = 4096;
const XML_ROOT_ELEMENT =
	/^(?:\s|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?\s*>)*<([A-Za-z_][\w:.-]*)/i;

function startsWith(bytes: ArrayLike<number>, signature: readonly number[], offset = 0) {
	return signature.every((byte, index) => bytes[offset + index] === byte);
}

function asciiAt(bytes: ArrayLike<number>, start: number, end: number) {
	let value = "";

	for (let index = start; index < Math.min(end, bytes.length); index += 1) {
		value += String.fromCharCode(bytes[index]);
	}

	return value;
}

function image(extension: string, mimeType: string, name: string): FileSignature {
	return { extension, kind: "image", mimeType, name };
}

function isBitmap(bytes: ArrayLike<number>) {
	return (
		startsWith(bytes, [0x42, 0x4d]) &&
		startsWith(bytes, [0x00, 0x00, 0x00, 0x00], 6) &&
		BMP_HEADER_SIZES.has(bytes[14]) &&
		startsWith(bytes, [0x00, 0x00, 0x00], 15)
	);
}

function detectIsoMediaImage(bytes: ArrayLike<number>) {
	if (asciiAt(bytes, 4, 8) !== "ftyp") {
		return undefined;
	}

	const brand = asciiAt(bytes, 8, 12);

	if (AVIF_BRANDS.has(brand)) {
		return image("avif", "image/avif", "AVIF image");
	}

	if (HEIF_BRANDS.has(brand)) {
		return image("heic", "image/heic", "HEIF image");
	}

	return undefined;
}

export function detectFileSignature(bytes: ArrayLike<number>): FileSignature {
	const head = asciiAt(bytes, 0, 16);

	if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) {
		return image("png", "image/png", "PNG image");
	}

	if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
		return image("jpg", "image/jpeg", "JPEG image");
	}

	if (head.startsWith("GIF87a") || head.startsWith("GIF89a")) {
		return image("gif", "image/gif", "GIF image");
	}

	if (head.slice(0, 4) === "RIFF" && head.slice(8, 12) === "WEBP") {
		return image("webp", "image/webp", "WebP image");
	}

	if (isBitmap(bytes)) {
		return image("bmp", "image/bmp", "BMP image");
	}

	if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) {
		return image("tiff", "image/tiff", "TIFF image");
	}

	if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00]) || startsWith(bytes, [0x00, 0x00, 0x02, 0x00])) {
		return image("ico", "image/vnd.microsoft.icon", "Windows icon");
	}

	if (
		startsWith(bytes, [0xff, 0x0a]) ||
		startsWith(bytes, [0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20])
	) {
		return image("jxl", "image/jxl", "JPEG XL image");
	}

	if (head.startsWith("8BPS") && (startsWith(bytes, [0x00, 0x01], 4) || startsWith(bytes, [0x00, 0x02], 4))) {
		return image("psd", "image/vnd.adobe.photoshop", "Photoshop image");
	}

	const isoMediaImage = detectIsoMediaImage(bytes);

	if (isoMediaImage) {
		return isoMediaImage;
	}

	if (head.startsWith("%PDF-")) {
		return {
			extension: "pdf",
			kind: "document",
			mimeType: "application/pdf",
			name: "PDF document",
		};
	}

	if (
		startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
		startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])
	) {
		return { extension: "zip", kind: "archive", mimeType: "application/zip", name: "ZIP archive" };
	}

	if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
		return {
			extension: "cfb",
			kind: "archive",
			mimeType: "application/x-cfb",
			name: "OLE compound file",
		};
	}

	if (head.startsWith("OggS")) {
		return { extension: "ogg", kind: "audio", mimeType: "application/ogg", name: "Ogg container" };
	}

	if (head.startsWith("ID3")) {
		return { extension: "mp3", kind: "audio", mimeType: "audio/mpeg", name: "MP3 audio" };
	}

	if (head.startsWith("\0asm")) {
		return {
			extension: "wasm",
			kind: "binary",
			mimeType: "application/wasm",
			name: "WebAssembly binary",
		};
	}

	return UNKNOWN_SIGNATURE;
}

export function decodeStrictUtf8Text(bytes: Uint8Array) {
	try {
		const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

		return text.includes("\0") ? undefined : text;
	} catch {
		return undefined;
	}
}

export function isSvgDocument(text: string) {
	const root = XML_ROOT_ELEMENT.exec(text.replace(/^﻿/, "").slice(0, SVG_SCAN_LENGTH));
	const name = root?.[1].toLowerCase() ?? "";

	return name === "svg" || name.endsWith(":svg");
}
