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

function expandIpv6(value: string): number[] | undefined {
	const text = value
		.toLowerCase()
		.replace(/^\[|\]$/g, "")
		.split("%")[0];
	const halves = text.split("::");

	if (halves.length > 2) {
		return undefined;
	}

	const parseGroups = (part: string) => {
		if (!part) {
			return [];
		}

		const groups: number[] = [];

		for (const group of part.split(":")) {
			const embedded = group.includes(".") ? parseIpv4(group) : undefined;

			if (embedded !== undefined) {
				groups.push((embedded >>> 16) & 0xffff, embedded & 0xffff);
				continue;
			}

			if (!/^[0-9a-f]{1,4}$/.test(group)) {
				return undefined;
			}

			groups.push(Number.parseInt(group, 16));
		}

		return groups;
	};

	const head = parseGroups(halves[0]);
	const tail = halves.length === 2 ? parseGroups(halves[1]) : [];

	if (!head || !tail) {
		return undefined;
	}

	const missing = 8 - head.length - tail.length;

	if ((halves.length === 2 && missing < 1) || (halves.length === 1 && missing !== 0)) {
		return undefined;
	}

	return [...head, ...Array<number>(Math.max(missing, 0)).fill(0), ...tail];
}

export function isPublicIpv6(value: string) {
	const groups = expandIpv6(value);

	if (!groups) {
		return false;
	}

	const [first, second] = groups;
	const embeddedIpv4 = groups[6] * 0x10000 + groups[7];

	if (groups.every((group) => group === 0)) {
		return false;
	}

	if (groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1) {
		return false;
	}

	if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
		return isPublicIpv4(embeddedIpv4);
	}

	if (first === 0x64 && second === 0xff9b) {
		return isPublicIpv4(embeddedIpv4);
	}

	if ((first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00) {
		return false;
	}

	if (first === 0x2001 && second === 0x0db8) {
		return false;
	}

	return (first & 0xe000) === 0x2000;
}

export function isPublicIpAddress(value: string) {
	const ipv4 = value.includes(":") ? undefined : parseIpv4(value);

	return ipv4 === undefined ? isPublicIpv6(value) : isPublicIpv4(ipv4);
}
