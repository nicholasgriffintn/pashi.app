export function createApiHeaders(apiKey: string, initialHeaders?: HeadersInit) {
	const headers = new Headers(initialHeaders);
	const credential = apiKey.trim();

	if (credential) {
		headers.set("X-API-Key", credential);
	}

	return headers;
}

export function apiFetch(input: RequestInfo | URL, apiKey: string, init: RequestInit = {}) {
	const shouldSendCredential = isSameOriginHttpRequest(input);

	return fetch(input, {
		...init,
		headers: createApiHeaders(
			shouldSendCredential ? apiKey : "",
			init.headers ?? (input instanceof Request ? input.headers : undefined),
		),
	});
}

export function isAuthenticatedApiUrl(value: string) {
	const baseUrl = typeof window === "undefined" ? "https://pashi.local" : window.location.href;
	const url = new URL(value, baseUrl);
	const isSameOrigin = typeof window === "undefined" || url.origin === window.location.origin;

	return isSameOrigin && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/export/"));
}

function isSameOriginHttpRequest(input: RequestInfo | URL) {
	if (typeof window === "undefined") {
		return true;
	}

	const value = input instanceof Request ? input.url : input.toString();
	const url = new URL(value, window.location.href);

	return (
		(url.protocol === "http:" || url.protocol === "https:") && url.origin === window.location.origin
	);
}
