import {
	parseBoolean,
	parseChoice,
	parseCount,
	randomChoice,
	randomCharacters,
	randomIntegerInRange,
	singleOrList,
} from "../../../../utils/generation";
import type { GeneratorRequest } from "../../request";

const HEX = "0123456789abcdef";
const IP_VERSIONS = ["ipv4", "ipv6", "both"] as const;
const MAC_FORMATS = ["colon", "hyphen", "dot", "cisco", "plain"] as const;

export function createIpAddresses(request: GeneratorRequest) {
	const version = parseChoice(request.fields.version, IP_VERSIONS, "ipv4");
	return createIpAddressList(request, () => {
		if (version === "both") {
			return randomChoice([createIpv4Address, createIpv6Address])(request);
		}

		return version === "ipv6" ? createIpv6Address(request) : createIpv4Address(request);
	});
}

export function createIpv4Addresses(request: GeneratorRequest) {
	return createIpAddressList(request, createIpv4Address);
}

export function createIpv6Addresses(request: GeneratorRequest) {
	return createIpAddressList(request, createIpv6Address);
}

export function createMacAddresses(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 10, 100);
	const unique = parseBoolean(request.fields.unique, false);
	return createTextList(count, unique, () => createMacAddress(request));
}

function createIpAddressList(request: GeneratorRequest, createValue: (request: GeneratorRequest) => string) {
	const count = parseCount(request.fields.count ?? "", 10, 100);
	const unique = parseBoolean(request.fields.unique, false);
	return createTextList(count, unique, () => createValue(request));
}

function createTextList(count: number, unique: boolean, createValue: () => string) {
	const values: string[] = [];
	const seen = new Set<string>();
	const maxAttempts = count * 10;
	let attempts = 0;

	while (values.length < count && attempts < maxAttempts) {
		attempts += 1;
		const value = createValue();
		if (unique && seen.has(value)) {
			continue;
		}

		values.push(value);
		seen.add(value);
	}

	return singleOrList(values);
}

function createIpv4Address(request: GeneratorRequest) {
	const includePrivate = parseBoolean(request.fields.includePrivate, true);
	const includeLocalhost = parseBoolean(request.fields.includeLocalhost, false);
	return createConstrainedValue(() => createIpv4Candidate(), (octets) => {
		if (isReservedIpv4(octets)) {
			return false;
		}
		if (!includePrivate && isPrivateIpv4(octets)) {
			return false;
		}
		if (!includeLocalhost && octets[0] === 127) {
			return false;
		}

		return true;
	}).join(".");
}

function createIpv6Address(request: GeneratorRequest) {
	const includePrivate = parseBoolean(request.fields.includePrivate, true);
	const includeLocalhost = parseBoolean(request.fields.includeLocalhost, false);
	const groups = createConstrainedValue(() => createIpv6Candidate(), (candidate) => {
		if (candidate.every((group) => group === "0000")) {
			return false;
		}
		if (!includeLocalhost && candidate.slice(0, 7).every((group) => group === "0000") && candidate[7] === "0001") {
			return false;
		}
		if (!includePrivate && isUniqueLocalIpv6(candidate[0])) {
			return false;
		}

		return true;
	});

	return groups.join(":");
}

function createMacAddress(request: GeneratorRequest) {
	const format = parseChoice(request.fields.format, MAC_FORMATS, "colon");
	const uppercase = parseBoolean(request.fields.uppercase, false);
	const local = parseBoolean(request.fields.local, true);
	const unicast = parseBoolean(request.fields.unicast, true);
	const bytes = Array.from({ length: 6 }, () => randomIntegerInRange(256));

	bytes[0] = local ? bytes[0] | 0x02 : bytes[0] & 0xfd;
	bytes[0] = unicast ? bytes[0] & 0xfe : bytes[0] | 0x01;

	const octets = bytes.map((byte) => byte.toString(16).padStart(2, "0"));
	const value = formatMacAddress(octets, format);
	return uppercase ? value.toUpperCase() : value;
}

function createConstrainedValue<T>(createValue: () => T, isValid: (value: T) => boolean) {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		const value = createValue();
		if (isValid(value)) {
			return value;
		}
	}

	return createValue();
}

function createIpv4Candidate() {
	return Array.from({ length: 4 }, () => randomIntegerInRange(256));
}

function createIpv6Candidate() {
	return Array.from({ length: 8 }, () => randomCharacters(HEX, 4));
}

function isReservedIpv4([first, second, third, fourth]: readonly number[]) {
	return (
		first === 0 ||
		first >= 224 ||
		(first === 127) ||
		(first === 169 && second === 254) ||
		(first === 192 && second === 0 && third === 2) ||
		(first === 198 && second === 51 && third === 100) ||
		(first === 203 && second === 0 && third === 113) ||
		(first === 255 && second === 255 && third === 255 && fourth === 255)
	);
}

function isPrivateIpv4([first, second]: readonly number[]) {
	return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

function isUniqueLocalIpv6(firstGroup: string) {
	const firstByte = Number.parseInt(firstGroup.slice(0, 2), 16);
	return (firstByte & 0xfe) === 0xfc;
}

function formatMacAddress(octets: readonly string[], format: (typeof MAC_FORMATS)[number]) {
	switch (format) {
		case "cisco":
			return `${octets[0]}${octets[1]}.${octets[2]}${octets[3]}.${octets[4]}${octets[5]}`;
		case "dot":
			return octets.join(".");
		case "hyphen":
			return octets.join("-");
		case "plain":
			return octets.join("");
		case "colon":
			return octets.join(":");
	}
}
