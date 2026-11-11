import { fetchCachedJson, UpstreamError } from "./cached-fetch.ts";
import { asArray, asNumber, asRecord, asString } from "./json-guards.ts";

export const CURRENCY_CODES = [
	"aud",
	"brl",
	"cad",
	"chf",
	"cny",
	"czk",
	"dkk",
	"eur",
	"gbp",
	"hkd",
	"huf",
	"idr",
	"ils",
	"inr",
	"isk",
	"jpy",
	"krw",
	"mxn",
	"myr",
	"nok",
	"nzd",
	"php",
	"pln",
	"ron",
	"sek",
	"sgd",
	"thb",
	"try",
	"usd",
	"zar",
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export interface CurrencyRates {
	date: string;
	perEuro: ReadonlyMap<string, number>;
}

export const CURRENCY_RATES_SOURCE =
	"European Central Bank reference rates via Frankfurter (frankfurter.dev)";

const RATES_URL = "https://api.frankfurter.dev/v2/rates?base=EUR&providers=ECB";
const RATES_TTL_SECONDS = 4 * 60 * 60;
const RATES_MAX_BYTES = 64 * 1024;
const RATES_MAX_ROWS = 100;

export function findCurrencyCode(value: string | undefined): CurrencyCode | undefined {
	const code = value?.trim().toLowerCase();

	return CURRENCY_CODES.find((candidate) => candidate === code);
}

export async function loadCurrencyRates(): Promise<CurrencyRates> {
	const { body } = await fetchCachedJson(RATES_URL, {
		maxBytes: RATES_MAX_BYTES,
		source: "Frankfurter",
		ttlSeconds: RATES_TTL_SECONDS,
	});
	const perEuro = new Map<string, number>([["eur", 1]]);
	let date: string | undefined;

	for (const row of asArray(body).slice(0, RATES_MAX_ROWS)) {
		const record = asRecord(row);
		const quote = asString(record?.quote)?.toLowerCase();
		const rate = asNumber(record?.rate);
		const rowDate = asString(record?.date);

		if (!quote || !rate || rate <= 0 || !rowDate) {
			continue;
		}

		perEuro.set(quote, rate);

		if (!date || rowDate < date) {
			date = rowDate;
		}
	}

	if (!date) {
		throw new UpstreamError("Frankfurter returned no exchange rates.");
	}

	return { date, perEuro };
}
