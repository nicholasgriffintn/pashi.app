import {
	assertQrPayloadByteLength,
	createQrPng,
	createQrSvg,
	MAX_QR_PAYLOAD_BYTES,
	normaliseQrSize,
} from "../../../lib/qr";
import { json } from "../../../utils/http";

export function createQrResponse(input: string, params: URLSearchParams) {
	const payload = input.trim();
	if (!payload) {
		return json({ error: "Pass a non-empty input." }, 400);
	}

	try {
		assertQrPayloadByteLength(payload);
	} catch {
		return json(
			{ error: `QR payloads are limited to ${MAX_QR_PAYLOAD_BYTES} UTF-8 bytes.` },
			400,
		);
	}

	const format = params.get("format") === "svg" ? "svg" : "png";
	const size = normaliseQrSize(params.get("size"));
	const image =
		format === "svg"
			? createQrSvg(payload, size.width, size.height)
			: createQrPng(payload, size.width, size.height);

	return new Response(image, {
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": format === "svg" ? "image/svg+xml; charset=utf-8" : "image/png",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
