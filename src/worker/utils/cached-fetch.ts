export const UPSTREAM_USER_AGENT = "Pashi (+https://pashi.app)";

const DEFAULT_TIMEOUT_MS = 6_000;
const PASSTHROUGH_STATUSES = new Set([400, 404]);

export class UpstreamError extends Error {
	readonly status: number;

	constructor(message: string, status = 502) {
		super(message);
		this.status = status;
	}
}

export interface CachedJsonOptions {
	headers?: Record<string, string>;
	maxBytes: number;
	source: string;
	timeoutMs?: number;
	ttlSeconds: number;
}

export interface CachedJson {
	body: unknown;
	status: number;
}

async function readBoundedText(response: Response, maxBytes: number, source: string) {
	const declared = Number(response.headers.get("Content-Length"));

	if (declared > maxBytes) {
		await response.body?.cancel();
		throw new UpstreamError(`${source} returned more data than Pashi will read.`);
	}

	const text = await response.text();

	if (text.length > maxBytes) {
		throw new UpstreamError(`${source} returned more data than Pashi will read.`);
	}

	return text;
}

function parseJson(text: string, source: string) {
	try {
		return JSON.parse(text);
	} catch {
		throw new UpstreamError(`${source} returned a response Pashi could not read.`);
	}
}

async function readCache(cache: Cache, key: Request) {
	try {
		return await cache.match(key);
	} catch {
		return undefined;
	}
}

async function writeCache(cache: Cache, key: Request, text: string, ttlSeconds: number) {
	try {
		await cache.put(
			key,
			new Response(text, {
				headers: {
					"Cache-Control": `public, max-age=${ttlSeconds}`,
					"Content-Type": "application/json",
				},
			}),
		);
	} catch {
		return;
	}
}

export async function fetchCachedJson(
	url: string,
	options: CachedJsonOptions,
): Promise<CachedJson> {
	const cache = caches.default;
	const key = new Request(url, { method: "GET" });
	const hit = await readCache(cache, key);

	if (hit) {
		return {
			body: parseJson(await readBoundedText(hit, options.maxBytes, options.source), options.source),
			status: 200,
		};
	}

	let response: Response;

	try {
		response = await fetch(url, {
			headers: {
				Accept: "application/json",
				"User-Agent": UPSTREAM_USER_AGENT,
				...options.headers,
			},
			signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
		});
	} catch (error) {
		if (error instanceof DOMException && error.name === "TimeoutError") {
			throw new UpstreamError(`${options.source} did not respond in time.`, 504);
		}

		console.error("pashi.upstream_fetch_failed", options.source, error);
		throw new UpstreamError(`Could not reach ${options.source}.`, 502);
	}

	if (PASSTHROUGH_STATUSES.has(response.status)) {
		await response.body?.cancel();

		return { body: undefined, status: response.status };
	}

	if (response.status === 429) {
		await response.body?.cancel();
		throw new UpstreamError(`${options.source} is rate limiting requests. Try again shortly.`, 503);
	}

	if (!response.ok) {
		await response.body?.cancel();
		throw new UpstreamError(`${options.source} is unavailable (HTTP ${response.status}).`);
	}

	const text = await readBoundedText(response, options.maxBytes, options.source);
	const body = parseJson(text, options.source);

	await writeCache(cache, key, text, options.ttlSeconds);

	return { body, status: 200 };
}
