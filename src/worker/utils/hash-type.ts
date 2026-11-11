export type HashLikelihood = "likely" | "possible";

export interface HashCandidate {
	algorithm: string;
	likelihood: HashLikelihood;
}

export interface HashIdentification {
	candidates: HashCandidate[];
	cost?: number;
	encoding: string;
	length: number;
	summary: string;
}

interface HashFormat {
	candidates: readonly HashCandidate[];
	encoding: string;
	pattern: RegExp;
}

const LIST_FORMAT = new Intl.ListFormat("en-GB", { style: "long", type: "disjunction" });
const MODULAR_CRYPT = "modular crypt format";
const BCRYPT_PATTERN = /^\$2[abxy]?\$(\d{2})\$[./A-Za-z0-9]{53}$/;

function ranked(likely: string, ...alternatives: string[]): HashCandidate[] {
	return [{ algorithm: likely, likelihood: "likely" }, ...possible(...alternatives)];
}

function possible(...algorithms: string[]): HashCandidate[] {
	return algorithms.map((algorithm) => ({ algorithm, likelihood: "possible" }));
}

const PREFIXED_FORMATS: readonly HashFormat[] = [
	{ candidates: ranked("bcrypt"), encoding: MODULAR_CRYPT, pattern: BCRYPT_PATTERN },
	{ candidates: ranked("Argon2id"), encoding: MODULAR_CRYPT, pattern: /^\$argon2id\$/ },
	{ candidates: ranked("Argon2i"), encoding: MODULAR_CRYPT, pattern: /^\$argon2i\$/ },
	{ candidates: ranked("Argon2d"), encoding: MODULAR_CRYPT, pattern: /^\$argon2d\$/ },
	{ candidates: ranked("scrypt"), encoding: MODULAR_CRYPT, pattern: /^\$(?:scrypt|7)\$/ },
	{
		candidates: ranked("scrypt"),
		encoding: "Werkzeug hash string",
		pattern: /^scrypt:\d+:\d+:\d+\$/,
	},
	{
		candidates: ranked("PBKDF2-HMAC-SHA256"),
		encoding: MODULAR_CRYPT,
		pattern: /^\$pbkdf2-sha256\$/,
	},
	{
		candidates: ranked("PBKDF2-HMAC-SHA512"),
		encoding: MODULAR_CRYPT,
		pattern: /^\$pbkdf2-sha512\$/,
	},
	{
		candidates: ranked("PBKDF2-HMAC-SHA1"),
		encoding: MODULAR_CRYPT,
		pattern: /^\$pbkdf2(?:-sha1)?\$/,
	},
	{
		candidates: ranked("PBKDF2 (Django)"),
		encoding: "Django hash string",
		pattern: /^pbkdf2_sha(?:1|256)\$\d+\$/,
	},
	{
		candidates: ranked("PBKDF2 (Werkzeug)"),
		encoding: "Werkzeug hash string",
		pattern: /^pbkdf2:sha(?:1|256|512):\d+\$/,
	},
	{ candidates: ranked("sha256crypt"), encoding: MODULAR_CRYPT, pattern: /^\$5\$/ },
	{ candidates: ranked("sha512crypt"), encoding: MODULAR_CRYPT, pattern: /^\$6\$/ },
	{ candidates: ranked("md5crypt"), encoding: MODULAR_CRYPT, pattern: /^\$1\$/ },
	{ candidates: ranked("Apache MD5 (apr1)"), encoding: MODULAR_CRYPT, pattern: /^\$apr1\$/ },
	{ candidates: ranked("yescrypt"), encoding: MODULAR_CRYPT, pattern: /^\$y\$/ },
	{
		candidates: ranked("MySQL 4.1+ (double SHA-1)"),
		encoding: "asterisk followed by 40 hexadecimal characters",
		pattern: /^\*[0-9A-Fa-f]{40}$/,
	},
];

const HEX_CANDIDATES = new Map<number, HashCandidate[]>([
	[8, ranked("CRC32", "Adler-32")],
	[16, possible("MySQL 3.23 (old password)", "CRC-64", "half MD5")],
	[32, ranked("MD5", "NTLM", "MD4")],
	[40, ranked("SHA-1", "RIPEMD-160")],
	[56, ranked("SHA-224", "SHA3-224")],
	[64, ranked("SHA-256", "SHA3-256", "BLAKE2s-256")],
	[96, ranked("SHA-384", "SHA3-384")],
	[128, ranked("SHA-512", "SHA3-512", "BLAKE2b-512", "Whirlpool")],
]);

const BASE64_DIGEST_CANDIDATES = new Map<number, HashCandidate[]>([
	[16, possible("MD5 (base64 of the raw digest)")],
	[20, possible("SHA-1 (base64 of the raw digest)")],
	[28, possible("SHA-224 (base64 of the raw digest)")],
	[32, possible("SHA-256 (base64 of the raw digest)")],
	[48, possible("SHA-384 (base64 of the raw digest)")],
	[64, possible("SHA-512 (base64 of the raw digest)")],
]);

export function identifyHash(input: string): HashIdentification {
	const value = input.trim();
	const prefixed = PREFIXED_FORMATS.find((format) => format.pattern.test(value));
	const cost = bcryptCost(value);
	const detected = prefixed
		? { candidates: [...prefixed.candidates], encoding: prefixed.encoding }
		: (identifyHexDigest(value) ?? identifyBase64Digest(value));
	const candidates = detected?.candidates ?? [];

	return {
		candidates,
		...(cost === undefined ? {} : { cost }),
		encoding: detected?.encoding ?? "unrecognised",
		length: value.length,
		summary: summariseHashCandidates(candidates, cost),
	};
}

function bcryptCost(value: string) {
	const match = BCRYPT_PATTERN.exec(value);

	return match ? Number.parseInt(match[1], 10) : undefined;
}

function identifyHexDigest(value: string) {
	if (!/^[0-9a-fA-F]+$/.test(value)) {
		return undefined;
	}

	return {
		candidates: [...(HEX_CANDIDATES.get(value.length) ?? [])],
		encoding: `hexadecimal (${hexLetterCase(value)})`,
	};
}

function hexLetterCase(value: string) {
	const hasLower = /[a-f]/.test(value);
	const hasUpper = /[A-F]/.test(value);

	if (hasLower && hasUpper) {
		return "mixed case";
	}

	return hasUpper ? "uppercase" : "lowercase";
}

function identifyBase64Digest(value: string) {
	const isBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(value);
	const isBase64Url = /^[A-Za-z0-9_-]+={0,2}$/.test(value);
	const unpadded = value.replace(/=+$/, "");

	if ((!isBase64 && !isBase64Url) || unpadded.length % 4 === 1) {
		return undefined;
	}

	const candidates = BASE64_DIGEST_CANDIDATES.get(Math.floor((unpadded.length * 3) / 4));

	return candidates
		? { candidates: [...candidates], encoding: isBase64 ? "base64" : "base64url" }
		: undefined;
}

function summariseHashCandidates(candidates: readonly HashCandidate[], cost: number | undefined) {
	const [first, ...alternatives] = candidates;

	if (!first) {
		return "No known hash format matched this value.";
	}

	const lead = `${first.likelihood === "likely" ? "Likely" : "Possibly"} ${first.algorithm}`;
	const detail = cost === undefined ? "" : ` with a cost factor of ${cost}`;
	const others =
		alternatives.length === 0
			? ""
			: `; ${LIST_FORMAT.format(alternatives.map((candidate) => candidate.algorithm))} ${
					alternatives.length === 1 ? "is" : "are"
				} also possible`;

	return `${lead}${detail}${others}.`;
}
