import { lookupDns } from "./dns-over-https";
import { isPublicIpAddress } from "./ip";
import { parsePublicHttpUrl } from "./urls";

export const PUBLIC_FETCH_USER_AGENT = "Pashi site inspector (+https://pashi.app)";

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_REDIRECTS = 10;
const ALLOWED_PORTS = new Set(["", "80", "443"]);

export class PublicFetchError extends Error {
	readonly status: number;

	constructor(message: string, status = 422) {
		super(message);
		this.status = status;
	}
}

export interface RedirectHop {
	location?: string;
	status: number;
	url: string;
}

export interface PublicFetchResult {
	body: string;
	bodyTruncated: boolean;
	finalUrl: URL;
	headers: Headers;
	hops: RedirectHop[];
	status: number;
}

export interface PublicFetchOptions {
	accept?: string;
	followRedirects?: boolean;
	maxBodyBytes: number;
	maxRedirects?: number;
	timeoutMs?: number;
}

export function normaliseInspectableUrl(value: string) {
	const trimmed = value.trim();
	const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	const url = parsePublicHttpUrl(withScheme);

	if (!url || !ALLOWED_PORTS.has(url.port)) {
		throw new PublicFetchError(
			"Use a public HTTP or HTTPS address on the default port, such as https://example.com.",
			400,
		);
	}

	url.hash = "";

	return url;
}

export async function assertPublicHost(hostname: string) {
	const [ipv4, ipv6] = await Promise.all([lookupDns(hostname, "A"), lookupDns(hostname, "AAAA")]);

	if (ipv4.status === "error" && ipv6.status === "error") {
		throw new PublicFetchError(`Could not resolve ${hostname}. Try again in a moment.`, 502);
	}

	const addresses = [...ipv4.answers, ...ipv6.answers]
		.filter((answer) => answer.type === "A" || answer.type === "AAAA")
		.map((answer) => answer.data);

	if (addresses.length === 0) {
		throw new PublicFetchError(`${hostname} does not resolve to an address.`, 400);
	}

	if (addresses.some((address) => !isPublicIpAddress(address))) {
		throw new PublicFetchError(`${hostname} resolves to a private or reserved address.`, 400);
	}
}

async function readCappedBody(response: Response, maxBytes: number) {
	if (!response.body || maxBytes === 0) {
		await response.body?.cancel();

		return { body: "", truncated: false };
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let received = 0;
	let body = "";
	let truncated = false;

	while (true) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		const remaining = maxBytes - received;

		if (value.byteLength > remaining) {
			body += decoder.decode(value.subarray(0, remaining), { stream: true });
			truncated = true;
			await reader.cancel();
			break;
		}

		received += value.byteLength;
		body += decoder.decode(value, { stream: true });
	}

	return { body: body + decoder.decode(), truncated };
}

export async function fetchPublic(
	start: URL,
	{
		accept = "*/*",
		followRedirects = true,
		maxBodyBytes,
		maxRedirects = DEFAULT_MAX_REDIRECTS,
		timeoutMs = DEFAULT_TIMEOUT_MS,
	}: PublicFetchOptions,
): Promise<PublicFetchResult> {
	const hops: RedirectHop[] = [];
	let current = start;

	for (let hop = 0; hop <= maxRedirects; hop++) {
		await assertPublicHost(current.hostname);

		let response: Response;

		try {
			response = await fetch(current, {
				headers: { Accept: accept, "User-Agent": PUBLIC_FETCH_USER_AGENT },
				redirect: "manual",
				signal: AbortSignal.timeout(timeoutMs),
			});
		} catch {
			throw new PublicFetchError(`Could not reach ${current.origin}.`, 502);
		}

		const location = response.headers.get("Location") ?? undefined;
		const isRedirect = response.status >= 300 && response.status < 400 && location !== undefined;

		hops.push({ location, status: response.status, url: current.href });

		if (!isRedirect || !followRedirects) {
			const { body, truncated } = await readCappedBody(response, maxBodyBytes);

			return {
				body,
				bodyTruncated: truncated,
				finalUrl: current,
				headers: response.headers,
				hops,
				status: response.status,
			};
		}

		await response.body?.cancel();

		let next: URL;

		try {
			next = normaliseInspectableUrl(new URL(location, current).href);
		} catch {
			throw new PublicFetchError(
				`The redirect from ${current.href} points somewhere Pashi will not follow.`,
			);
		}

		current = next;
	}

	throw new PublicFetchError(`Stopped after ${maxRedirects} redirects.`);
}
