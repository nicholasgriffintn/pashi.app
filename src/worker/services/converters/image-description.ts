import type { UploadedFile } from "../../utils/body.ts";
import { detectFileSignature } from "../../utils/file-signature.ts";
import { bytesToBase64 } from "../../utils/generation.ts";

export const IMAGE_DESCRIPTION_FORMATS = ["all", "alt-text", "description"] as const;
export const IMAGE_DESCRIPTION_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_DESCRIPTION_MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";
export const IMAGE_DESCRIPTION_EXTENSIONS = [".gif", ".jpeg", ".jpg", ".png", ".webp"];
export const IMAGE_DESCRIPTION_MIME_TYPES = ["image/gif", "image/jpeg", "image/png", "image/webp"];

export type ImageDescriptionFormat = (typeof IMAGE_DESCRIPTION_FORMATS)[number];

const SUPPORTED_MIME_TYPES = new Set(IMAGE_DESCRIPTION_MIME_TYPES);
const ALT_TEXT_MAX_LENGTH = 200;
const PROMPT = [
	"Look at the image and reply in exactly this format with no other text.",
	"ALT: one sentence of alt text under 125 characters, without the words image or picture.",
	"DESCRIPTION: a detailed paragraph covering subject, setting, colours, text and mood.",
].join("\n");

export class ImageDescriptionError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "ImageDescriptionError";
		this.status = status;
	}
}

export interface ImageDescriptionResult {
	altText: string;
	description: string;
}

export function isImageDescriptionFormat(value: string): value is ImageDescriptionFormat {
	return IMAGE_DESCRIPTION_FORMATS.some((format) => format === value);
}

function parseReply(reply: string): ImageDescriptionResult | undefined {
	const match = reply.match(/ALT:\s*([\s\S]*?)\s*DESCRIPTION:\s*([\s\S]+)/i);
	const altText = match?.[1].trim().slice(0, ALT_TEXT_MAX_LENGTH);
	const description = match?.[2].trim();

	return altText && description ? { altText, description } : undefined;
}

export async function describeImage(ai: Ai, file: UploadedFile): Promise<ImageDescriptionResult> {
	if (file.bytes.byteLength > IMAGE_DESCRIPTION_MAX_BYTES) {
		throw new ImageDescriptionError(
			`Image is larger than the ${IMAGE_DESCRIPTION_MAX_BYTES / (1024 * 1024)} MiB limit.`,
			422,
		);
	}

	const signature = detectFileSignature(file.bytes);

	if (!SUPPORTED_MIME_TYPES.has(signature.mimeType)) {
		throw new ImageDescriptionError(
			"Upload a PNG, JPEG, WebP or GIF image. This file is not one of those.",
			415,
		);
	}

	let reply: string;

	try {
		const output = await ai.run(IMAGE_DESCRIPTION_MODEL, {
			max_tokens: 600,
			messages: [
				{
					content: [
						{ text: PROMPT, type: "text" },
						{
							image_url: { url: `data:${signature.mimeType};base64,${bytesToBase64(file.bytes)}` },
							type: "image_url",
						},
					],
					role: "user",
				},
			],
			temperature: 0.2,
		});

		reply = typeof output === "object" && "response" in output ? String(output.response ?? "") : "";
	} catch {
		throw new ImageDescriptionError("The image could not be described.", 422);
	}

	const parsed = parseReply(reply);

	if (!parsed) {
		throw new ImageDescriptionError("The model returned no description. Try again.", 422);
	}

	return parsed;
}
