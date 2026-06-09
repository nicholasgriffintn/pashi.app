import type { GeneratorRequest } from "../../request";
import {
	base64UrlToBytes,
	bytesToBase64,
	concatBytes,
	parseChoice,
	parseCount,
	parseInteger,
	singleOrList,
} from "../../../../utils/generation";
import { arrayBufferToPem, requireArrayBuffer, requireCryptoKeyPair, requireJsonWebKey } from "../../../../utils/crypto";

const SSH_KEY_TYPES = ["rsa"] as const;
const SSH_KEY_FORMATS = ["pem", "both"] as const;

export async function createSshKeys(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 1, 5);
	const keys = await Promise.all(Array.from({ length: count }, () => createSshKey(request)));
	return singleOrList(keys);
}

async function createSshKey(request: GeneratorRequest) {
	const type = parseChoice(request.fields.type, SSH_KEY_TYPES, "rsa");
	const format = parseChoice(request.fields.format, SSH_KEY_FORMATS, "both");
	const passphrase = request.fields.passphrase?.trim();

	if (type !== "rsa") {
		throw new Error("Only RSA SSH keys are supported.");
	}
	if (passphrase) {
		throw new Error("Passphrase-protected SSH keys are not supported yet.");
	}

	const bits = parseSshKeyBits(request);
	const comment = sanitizeSshComment(request.fields.comment);
	const generatedKey = await crypto.subtle.generateKey(
		{
			hash: "SHA-256",
			modulusLength: bits,
			name: "RSASSA-PKCS1-v1_5",
			publicExponent: new Uint8Array([1, 0, 1]),
		},
		true,
		["sign", "verify"],
	);
	const keyPair = requireCryptoKeyPair(generatedKey);
	const [privateKey, publicKey, publicJwk] = await Promise.all([
		crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
		crypto.subtle.exportKey("spki", keyPair.publicKey),
		crypto.subtle.exportKey("jwk", keyPair.publicKey),
	]);
	const publicBlob = createRsaSshPublicBlob(requireJsonWebKey(publicJwk));
	const authorizedKey = `ssh-rsa ${bytesToBase64(publicBlob)}${comment ? ` ${comment}` : ""}`;
	const fingerprint = await createSshFingerprint(publicBlob);
	const record = {
		authorizedKey,
		bits: `${bits}`,
		comment,
		fingerprint,
		format,
		passphraseProtected: "false",
		privateKeyPem: arrayBufferToPem("PRIVATE KEY", requireArrayBuffer(privateKey)),
		publicKeyPem: arrayBufferToPem("PUBLIC KEY", requireArrayBuffer(publicKey)),
		recommendedUse: bits === 4096 ? "Legacy systems, maximum RSA security" : "Development and test SSH authentication",
		type: "rsa",
	};

	if (format === "pem") {
		return {
			bits: record.bits,
			comment: record.comment,
			fingerprint: record.fingerprint,
			format: record.format,
			privateKeyPem: record.privateKeyPem,
			publicKeyPem: record.publicKeyPem,
			type: record.type,
		};
	}

	return record;
}

function parseSshKeyBits(request: GeneratorRequest) {
	const rawBits = parseInteger(request.fields.bits ?? request.fields.keySize ?? request.fields.key_size ?? "", 2048, 2048, 4096);
	return rawBits >= 4096 ? 4096 : 2048;
}

function sanitizeSshComment(value: string | undefined) {
	return (value ?? "pashi@localhost")
		.replace(/[\r\n\t]+/g, " ")
		.trim()
		.slice(0, 120);
}

function createRsaSshPublicBlob(jwk: JsonWebKey) {
	if (jwk.kty !== "RSA" || !jwk.e || !jwk.n) {
		throw new Error("RSA public key export failed.");
	}

	return concatBytes([
		createSshString(new TextEncoder().encode("ssh-rsa")),
		createSshMpint(base64UrlToBytes(jwk.e)),
		createSshMpint(base64UrlToBytes(jwk.n)),
	]);
}

function createSshString(bytes: Uint8Array) {
	return concatBytes([uint32Bytes(bytes.byteLength), bytes]);
}

function createSshMpint(bytes: Uint8Array) {
	const stripped = stripLeadingZeroes(bytes);
	const encoded = stripped[0] && stripped[0] >= 0x80 ? concatBytes([new Uint8Array([0]), stripped]) : stripped;
	return createSshString(encoded);
}

function stripLeadingZeroes(bytes: Uint8Array) {
	let offset = 0;
	while (offset < bytes.length - 1 && bytes[offset] === 0) {
		offset += 1;
	}

	return bytes.slice(offset);
}

function uint32Bytes(value: number) {
	const bytes = new Uint8Array(4);
	const view = new DataView(bytes.buffer);
	view.setUint32(0, value, false);
	return bytes;
}

async function createSshFingerprint(publicBlob: Uint8Array) {
	const digest = await crypto.subtle.digest("SHA-256", publicBlob);
	return `SHA256:${bytesToBase64(new Uint8Array(digest)).replace(/=+$/, "")}`;
}
