import type { UploadedFile } from "../../utils/body.ts";
import {
	decodeStrictUtf8Text,
	detectFileSignature,
	isSvgDocument,
} from "../../utils/file-signature.ts";
import { fileExtension, safeFilename } from "../../utils/text.ts";

export const DOCUMENT_MARKDOWN_FORMATS = ["markdown", "text"] as const;

export type DocumentMarkdownFormat = (typeof DOCUMENT_MARKDOWN_FORMATS)[number];

type DocumentContainer = "pdf" | "text" | "zip";

interface DocumentFormat {
	container: DocumentContainer;
	label: string;
	mimeType: string;
}

const DOCUMENT_FORMATS = {
	csv: { container: "text", label: "CSV", mimeType: "text/csv" },
	docx: {
		container: "zip",
		label: "Word document",
		mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	},
	htm: { container: "text", label: "HTML", mimeType: "text/html" },
	html: { container: "text", label: "HTML", mimeType: "text/html" },
	pdf: { container: "pdf", label: "PDF", mimeType: "application/pdf" },
	xml: { container: "text", label: "XML", mimeType: "application/xml" },
} as const satisfies Record<string, DocumentFormat>;

type DocumentExtension = keyof typeof DOCUMENT_FORMATS;

const CONTAINER_SIGNATURES: Record<Exclude<DocumentContainer, "text">, string> = {
	pdf: "pdf",
	zip: "zip",
};

const MIME_TYPE_ALIASES: Readonly<Record<string, DocumentExtension>> = {
	"application/xhtml+xml": "html",
	"text/xml": "xml",
};

const ACCEPTED_FORMATS_COPY = "PDF, Word (DOCX), CSV, HTML or XML";
const IMAGE_REFUSAL = "Images are not supported, because converting them runs paid image models.";
const SVG_REFUSAL = `${IMAGE_REFUSAL} SVG files count as images.`;
const SVG_EXTENSIONS = new Set(["svg", "svgz"]);

export const DOCUMENT_MARKDOWN_EXTENSIONS = Object.keys(DOCUMENT_FORMATS).map(
	(extension) => `.${extension}`,
);

export const DOCUMENT_MARKDOWN_MIME_TYPES = [
	...new Set(Object.values(DOCUMENT_FORMATS).map((format) => format.mimeType)),
];

export class DocumentMarkdownError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "DocumentMarkdownError";
		this.status = status;
	}
}

export interface DocumentMarkdownResult {
	content: string;
	downloadName: string;
	label: string;
	tokens: number;
}

export function isDocumentMarkdownFormat(value: string): value is DocumentMarkdownFormat {
	return DOCUMENT_MARKDOWN_FORMATS.some((format) => format === value);
}

function isDocumentExtension(value: string): value is DocumentExtension {
	return Object.hasOwn(DOCUMENT_FORMATS, value);
}

function extensionFromMimeType(mimeType: string): DocumentExtension | undefined {
	const normalised = mimeType.split(";")[0].trim().toLowerCase();
	const match = Object.entries(DOCUMENT_FORMATS).find(
		([, format]) => format.mimeType === normalised,
	);

	if (match && isDocumentExtension(match[0])) {
		return match[0];
	}

	return MIME_TYPE_ALIASES[normalised];
}

function unsupported(message: string): never {
	throw new DocumentMarkdownError(message, 415);
}

function assertNotImage(file: UploadedFile) {
	const signature = detectFileSignature(file.bytes);

	if (signature.kind === "image") {
		unsupported(`${IMAGE_REFUSAL} This file is a ${signature.name}.`);
	}

	if (SVG_EXTENSIONS.has(fileExtension(file.name))) {
		unsupported(SVG_REFUSAL);
	}
}

function resolveExtension(file: UploadedFile) {
	const named = fileExtension(file.name);

	if (isDocumentExtension(named)) {
		return named;
	}

	if (!named) {
		const fromType = extensionFromMimeType(file.type);

		if (fromType) {
			return fromType;
		}

		if (file.type.toLowerCase().startsWith("image/")) {
			unsupported(IMAGE_REFUSAL);
		}
	}

	return unsupported(
		named
			? `.${named} files are not supported. Upload a ${ACCEPTED_FORMATS_COPY} file.`
			: `Name the file with its extension, for example with sourceName=report.pdf. Upload a ${ACCEPTED_FORMATS_COPY} file.`,
	);
}

function assertContents(extension: DocumentExtension, bytes: Uint8Array) {
	const format: DocumentFormat = DOCUMENT_FORMATS[extension];

	if (format.container !== "text") {
		if (detectFileSignature(bytes).extension !== CONTAINER_SIGNATURES[format.container]) {
			unsupported(`This file is named .${extension} but its contents are not a ${format.label}.`);
		}

		return;
	}

	const text = decodeStrictUtf8Text(bytes);

	if (text === undefined) {
		unsupported(`This file is named .${extension} but is not valid UTF-8 text.`);
	}

	if (isSvgDocument(text)) {
		unsupported(SVG_REFUSAL);
	}
}

function conversionOptions(outputFormat: DocumentMarkdownFormat): ConversionOptions {
	return {
		docx: { images: { convert: false } },
		html: { images: { convert: false, convertOGImage: false } },
		output: { format: outputFormat },
		pdf: { images: { convert: false } },
	};
}

function sourceStem(name: string, extension: string) {
	const base = name.toLowerCase().endsWith(`.${extension}`)
		? name.slice(0, -(extension.length + 1))
		: name;

	return safeFilename(base || "document");
}

async function requestConversion(
	ai: Ai,
	document: MarkdownDocument,
	outputFormat: DocumentMarkdownFormat,
	label: string,
) {
	const failure = new DocumentMarkdownError(`The ${label} could not be converted.`, 422);
	let response: ConversionResponse;

	try {
		response = await ai.toMarkdown(document, {
			conversionOptions: conversionOptions(outputFormat),
		});
	} catch {
		throw failure;
	}

	if (response.format === "error") {
		throw failure;
	}

	return response;
}

export async function convertDocumentToMarkdown(
	ai: Ai,
	file: UploadedFile,
	outputFormat: DocumentMarkdownFormat,
): Promise<DocumentMarkdownResult> {
	assertNotImage(file);

	const extension = resolveExtension(file);
	const format: DocumentFormat = DOCUMENT_FORMATS[extension];

	assertContents(extension, file.bytes);

	const stem = sourceStem(file.name, extension);
	const response = await requestConversion(
		ai,
		{ blob: new Blob([file.bytes], { type: format.mimeType }), name: `${stem}.${extension}` },
		outputFormat,
		format.label,
	);

	if (format.container === "pdf" && !response.data.trim()) {
		throw new DocumentMarkdownError(
			"This PDF has no text layer. It looks like a scanned image, and OCR is not supported.",
			422,
		);
	}

	return {
		content: response.data,
		downloadName: `pashi-${stem}.${outputFormat === "markdown" ? "md" : "txt"}`,
		label: format.label,
		tokens: response.tokens,
	};
}
