import {
	assertQrPayloadByteLength,
	MAX_QR_PAYLOAD_BYTES,
	normaliseQrSize,
	type QrSize,
} from "./qr";

const QR_FORMATS = ["png", "svg"] as const;

export type QrImageFormat = (typeof QR_FORMATS)[number];

export interface QrGenerationRequest {
	format: QrImageFormat;
	payload: string;
	size: QrSize;
}

export interface QrGenerationError {
	message: string;
	status: 400;
}

function isQrImageFormat(value: string): value is QrImageFormat {
	return QR_FORMATS.includes(value as QrImageFormat);
}

export function parseQrGenerationRequest(
	params: URLSearchParams,
): QrGenerationError | QrGenerationRequest {
	const payload = params.get("data")?.trim();
	if (!payload) {
		return {
			message: "Pass a non-empty data query parameter.",
			status: 400,
		};
	}

	const formatParam = params.get("format") ?? "png";
	if (!isQrImageFormat(formatParam)) {
		return {
			message: "QR format must be png or svg.",
			status: 400,
		};
	}

	try {
		assertQrPayloadByteLength(payload);
	} catch {
		return {
			message: `QR payloads are limited to ${MAX_QR_PAYLOAD_BYTES} UTF-8 bytes.`,
			status: 400,
		};
	}

	return {
		format: formatParam,
		payload,
		size: normaliseQrSize(params.get("size")),
	};
}
