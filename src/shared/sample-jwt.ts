export const SAMPLE_JWT_SECRET = "pashi-example-secret";

const SAMPLE_JWT_SIGNATURE = "I6D7Nb-ufmRqCSh9TJCf1cE5A4sF4sMbVL_k-7P_jGo";

function encodeSegment(value: Record<string, unknown>) {
	return btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export const SAMPLE_JWT = [
	encodeSegment({ alg: "HS256", typ: "JWT" }),
	encodeSegment({ sub: "1234567890", name: "Ada Lovelace", iat: 1516239022 }),
	SAMPLE_JWT_SIGNATURE,
].join(".");
