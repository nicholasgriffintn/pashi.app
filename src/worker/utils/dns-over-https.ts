import { isRecord } from "../../shared/records";

export const DNS_RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "CAA"] as const;

export type DnsRecordType = (typeof DNS_RECORD_TYPES)[number];

export interface DnsAnswer {
	data: string;
	name: string;
	ttl: number;
	type: string;
}

export interface DnsLookup {
	answers: DnsAnswer[];
	status: "error" | "no-domain" | "ok";
}

const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const DOH_TIMEOUT_MS = 5_000;
const RECORD_TYPE_NAMES: Record<number, string> = {
	1: "A",
	2: "NS",
	5: "CNAME",
	15: "MX",
	16: "TXT",
	28: "AAAA",
	257: "CAA",
};

function readAnswers(value: unknown): DnsAnswer[] {
	if (!isRecord(value) || !Array.isArray(value.Answer)) {
		return [];
	}

	return value.Answer.flatMap((answer: unknown) => {
		if (!isRecord(answer) || typeof answer.data !== "string" || typeof answer.type !== "number") {
			return [];
		}

		return [
			{
				data: answer.data,
				name: typeof answer.name === "string" ? answer.name.replace(/\.$/, "") : "",
				ttl: typeof answer.TTL === "number" ? answer.TTL : 0,
				type: RECORD_TYPE_NAMES[answer.type] ?? String(answer.type),
			},
		];
	});
}

export async function lookupDns(hostname: string, type: DnsRecordType): Promise<DnsLookup> {
	const url = new URL(DOH_ENDPOINT);

	url.searchParams.set("name", hostname);
	url.searchParams.set("type", type);

	try {
		const response = await fetch(url, {
			headers: { Accept: "application/dns-json" },
			signal: AbortSignal.timeout(DOH_TIMEOUT_MS),
		});

		if (!response.ok) {
			return { answers: [], status: "error" };
		}

		const body: unknown = await response.json();
		const status = isRecord(body) ? body.Status : undefined;

		if (status === 3) {
			return { answers: [], status: "no-domain" };
		}

		return status === 0
			? { answers: readAnswers(body), status: "ok" }
			: { answers: [], status: "error" };
	} catch {
		return { answers: [], status: "error" };
	}
}
