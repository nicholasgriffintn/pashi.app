import { base64UrlToBytes, bytesToBase64Url, concatBytes } from "./generation";

const IV_BYTES = 12;
const KEY_INFO = new TextEncoder().encode("pashi-sealed-value-v1");

async function deriveKey(secret: string) {
	const material = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		"HKDF",
		false,
		["deriveKey"],
	);

	return crypto.subtle.deriveKey(
		{ hash: "SHA-256", info: KEY_INFO, name: "HKDF", salt: new Uint8Array(0) },
		material,
		{ length: 256, name: "AES-GCM" },
		false,
		["decrypt", "encrypt"],
	);
}

export async function sealValue(secret: string, value: string) {
	const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
	const sealed = await crypto.subtle.encrypt(
		{ iv, name: "AES-GCM" },
		await deriveKey(secret),
		new TextEncoder().encode(value),
	);

	return bytesToBase64Url(concatBytes([iv, new Uint8Array(sealed)]));
}

export async function openValue(secret: string, sealed: string) {
	const bytes = base64UrlToBytes(sealed);

	try {
		const opened = await crypto.subtle.decrypt(
			{ iv: bytes.subarray(0, IV_BYTES), name: "AES-GCM" },
			await deriveKey(secret),
			bytes.subarray(IV_BYTES),
		);

		return new TextDecoder().decode(opened);
	} catch {
		return undefined;
	}
}
