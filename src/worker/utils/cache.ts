export const CACHE_VERSION = "v1";

export const CACHE_CONTROL = {
	catalogue: "public, max-age=300, stale-while-revalidate=3600",
	deterministic: "public, max-age=31536000, immutable",
	dynamic: "no-store",
	preset: "public, max-age=3600",
} as const;

export type CacheProfile = keyof typeof CACHE_CONTROL;

export function withCacheControl(response: Response, profile: CacheProfile) {
	response.headers.set("Cache-Control", CACHE_CONTROL[profile]);

	return response;
}
