import { bytesToBase64 } from "./generation";

export function arrayBufferToPem(label: string, value: ArrayBuffer) {
	const base64 = bytesToBase64(new Uint8Array(value));
	const lines = base64.match(/.{1,64}/g) ?? [];
	return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}
