const BLOCKED_HOSTNAMES = new Set([
	"0.0.0.0",
	"127.0.0.1",
	"localhost",
]);

function ipv4Parts(hostname: string) {
	const parts = hostname.split(".");
	if (parts.length !== 4) {
		return undefined;
	}

	const numbers = parts.map((part) => Number(part));
	return numbers.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
		? numbers
		: undefined;
}

function isBlockedIpv4(hostname: string) {
	const parts = ipv4Parts(hostname);
	if (!parts) {
		return false;
	}

	const [first, second] = parts;
	return (
		first === 0 ||
		first === 10 ||
		first === 127 ||
		(first === 169 && second === 254) ||
		(first === 172 && second >= 16 && second <= 31) ||
		(first === 192 && second === 168)
	);
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
		BLOCKED_HOSTNAMES.has(hostname) ||
		hostname.endsWith(".local") ||
		hostname.includes(":") ||
		isBlockedIpv4(hostname)
	) {
		return undefined;
	}

	return url;
}
