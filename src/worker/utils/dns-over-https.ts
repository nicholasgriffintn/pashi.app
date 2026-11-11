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
	if (typeof value !== "object" || value === null || !("Answer" in value)) {
		return [];
	}

	const answers = (value as { Answer: unknown }).Answer;

	if (!Array.isArray(answers)) {
		return [];
	}

	return answers.flatMap((answer: unknown) => {
		if (typeof answer !== "object" || answer === null) {
			return [];
		}

		const record = answer as Record<string, unknown>;

		if (typeof record.data !== "string" || typeof record.type !== "number") {
			return [];
		}

		return [
			{
				data: record.data,
				name: typeof record.name === "string" ? record.name.replace(/\.$/, "") : "",
				ttl: typeof record.TTL === "number" ? record.TTL : 0,
				type: RECORD_TYPE_NAMES[record.type] ?? String(record.type),
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
		const status =
			typeof body === "object" && body !== null && "Status" in body ? body.Status : undefined;

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
