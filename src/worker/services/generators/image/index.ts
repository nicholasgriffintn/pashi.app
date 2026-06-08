import type { GeneratorTool } from "../types";
import type { GeneratorRequest } from "../request";
import { json } from "../../../utils/http";
import { createBarcodeResponse } from "./barcode";
import { createEmojiImageResponse } from "./emoji";
import { createQrResponse } from "./qr";

export function createImageResponse(
	generator: GeneratorTool,
	request: GeneratorRequest,
	params: URLSearchParams,
) {
	switch (generator.id) {
		case "barcode":
			return createBarcodeResponse(request);
		case "emoji-image":
			return createEmojiImageResponse(request);
		case "qr":
			return createQrResponse(request.input, params);
		default:
			return json({ error: "Unknown image generator type." }, 404);
	}
}
