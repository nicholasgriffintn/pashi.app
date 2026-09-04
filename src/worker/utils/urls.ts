import { isPublicIpv4, parseIpv4 } from "./ip";

const BLOCKED_HOST_SUFFIXES = [".local", ".localhost", ".internal", ".home.arpa"];

function isBlockedHostname(hostname: string) {
	if (!hostname.includes(".")) {
		return true;
	}

	if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
		return true;
	}

	const address = parseIpv4(hostname);

	return address === undefined ? false : !isPublicIpv4(address);
}

export function parsePublicHttpUrl(value: string) {
	const trimmedValue = value.trim();

	if (!trimmedValue) {
		return undefined;
	}

	let url: URL;

	try {
		url = new URL(trimmedValue);
	} catch {
		return undefined;
	}

	const hostname = url.hostname.toLowerCase();

	if (
		(url.protocol !== "http:" && url.protocol !== "https:") ||
		url.username ||
		url.password ||
		hostname.includes(":") ||
		hostname.startsWith("[") ||
		isBlockedHostname(hostname)
	) {
		return undefined;
	}

	return url;
}
