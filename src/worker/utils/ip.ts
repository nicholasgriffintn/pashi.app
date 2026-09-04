function parseOctet(part: string): number | undefined {
	if (!part) {
		return undefined;
	}

	const lower = part.toLowerCase();
	const value = lower.startsWith("0x")
		? Number.parseInt(lower.slice(2), 16)
		: lower.length > 1 && lower.startsWith("0")
			? Number.parseInt(lower.slice(1), 8)
			: Number.parseInt(lower, 10);

	if (!Number.isInteger(value) || value < 0) {
		return undefined;
	}

	const digits = lower.startsWith("0x") ? lower.slice(2) : lower;

	return /^[0-9a-f]+$/.test(digits) ? value : undefined;
}

export function parseIpv4(hostname: string): number | undefined {
	const parts = hostname.split(".");

	if (parts.length === 0 || parts.length > 4) {
		return undefined;
	}

	const values = parts.map(parseOctet);

	if (values.some((value) => value === undefined)) {
		return undefined;
	}

	const numbers = values.filter((value) => value !== undefined);
	const last = numbers[numbers.length - 1];
	const leading = numbers.slice(0, -1);
	const maximumLast = 2 ** (8 * (4 - leading.length));

	if (last >= maximumLast || leading.some((value) => value > 255)) {
		return undefined;
	}

	return leading.reduce((total, value, index) => total + value * 2 ** (8 * (3 - index)), last);
}

export function isPublicIpv4(address: number) {
	const first = (address >>> 24) & 0xff;
	const second = (address >>> 16) & 0xff;

	if (first === 0 || first === 10 || first === 127 || first >= 224) {
		return false;
	}

	if (first === 169 && second === 254) {
		return false;
	}

	if (first === 172 && second >= 16 && second <= 31) {
		return false;
	}

	if (first === 192 && second === 168) {
		return false;
	}

	if (first === 100 && second >= 64 && second <= 127) {
		return false;
	}

	if (first === 198 && (second === 18 || second === 19)) {
		return false;
	}

	return true;
}
