import type { GeneratorRequest } from "../../request";
import {
	createDigest,
	bytesToBase64Url,
	type DigestAlgorithm,
	parseBoolean,
	parseChoice,
	parseCount,
	randomBytes,
	singleOrList,
} from "../../../../utils/generation";

const HASH_ALGORITHMS = ["md5", "sha1", "sha256", "sha512"] as const;
const HASH_METADATA: Record<(typeof HASH_ALGORITHMS)[number], {
	bits: string;
	description: string;
	hexLength: string;
	webCryptoName: DigestAlgorithm;
}> = {
	md5: {
		bits: "128",
		description: "MD5 128-bit digest",
		hexLength: "32",
		webCryptoName: "MD5",
	},
	sha1: {
		bits: "160",
		description: "Secure Hash Algorithm 1 160-bit digest",
		hexLength: "40",
		webCryptoName: "SHA-1",
	},
	sha256: {
		bits: "256",
		description: "Secure Hash Algorithm 256-bit digest",
		hexLength: "64",
		webCryptoName: "SHA-256",
	},
	sha512: {
		bits: "512",
		description: "Secure Hash Algorithm 512-bit digest",
		hexLength: "128",
		webCryptoName: "SHA-512",
	},
};

export async function createHashes(request: GeneratorRequest) {
	const algorithm = parseChoice(request.fields.algorithm, HASH_ALGORITHMS, "sha256");
	const includeInput = parseBoolean(request.fields.includeInput ?? request.fields.include_input, false);
	const uppercase = parseBoolean(request.fields.uppercase, false);
	const input = request.fields.value?.trim() || request.fields.input?.trim() || request.input;
	const count = parseCount(request.fields.count ?? "", 1, 25);
	const metadata = HASH_METADATA[algorithm];
	const records = await Promise.all(
		Array.from({ length: count }, async () => {
			const value = input || bytesToBase64Url(randomBytes(32));
			const digest = await createDigest(value, metadata.webCryptoName);
			const hash = uppercase ? digest.toUpperCase() : digest;
			const record = {
				algorithm: algorithm.toUpperCase(),
				bits: metadata.bits,
				description: metadata.description,
				hash,
				hexLength: metadata.hexLength,
			};

			return includeInput ? { ...record, input: value } : record;
		}),
	);

	return singleOrList(records);
}
