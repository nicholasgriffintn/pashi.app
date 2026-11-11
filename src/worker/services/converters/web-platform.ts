import { isRecord } from "../../../shared/records.ts";
import { fetchCachedJson, UpstreamError } from "../../utils/cached-fetch.ts";
import {
	WEB_FEATURES,
	WEB_FEATURES_LICENCE,
	WEB_FEATURES_SOURCE,
	WEB_FEATURES_VERSION,
	type WebFeature,
} from "./data/web-features.ts";

export const WEB_PLATFORM_FORMATS = ["baseline", "feature", "end-of-life"] as const;

export type WebPlatformFormat = (typeof WEB_PLATFORM_FORMATS)[number];

export class WebPlatformError extends Error {
	readonly status: number;

	constructor(message: string, status = 422) {
		super(message);
		this.status = status;
	}
}

const MAX_QUERY_LENGTH = 100;
const MAX_QUERY_TOKENS = 6;
const MAX_MATCHES = 5;
const MAX_RELEASES = 15;
const EOL_API = "https://endoflife.date/api/v1/products";
const EOL_TTL_SECONDS = 4 * 60 * 60;
const EOL_TIMEOUT_MS = 5_000;
const EOL_MAX_BYTES = 512 * 1024;
const PRODUCT_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

const ATTRIBUTION = {
	baseline: {
		licence: WEB_FEATURES_LICENCE,
		source: WEB_FEATURES_SOURCE,
		version: WEB_FEATURES_VERSION,
	},
	"end-of-life": {
		licence: "endoflife.date, licensed under MIT",
		source: "https://endoflife.date",
	},
} as const;

export function isWebPlatformFormat(value: string | undefined): value is WebPlatformFormat {
	return WEB_PLATFORM_FORMATS.some((format) => format === value);
}

function normalise(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function readQuery(input: string) {
	const query = input.trim();

	if (!query) {
		throw new WebPlatformError("Enter a feature name or id, such as container-queries.");
	}

	if (query.length > MAX_QUERY_LENGTH) {
		throw new WebPlatformError(`Keep the search under ${MAX_QUERY_LENGTH} characters.`);
	}

	return query;
}

function scoreFeature(feature: WebFeature, phrase: string, tokens: readonly string[]) {
	const id = normalise(feature.id);
	const name = normalise(feature.name);

	if (id === phrase || name === phrase) {
		return 1000;
	}

	let score = 0;

	if (id.startsWith(phrase) || name.startsWith(phrase)) {
		score += 300;
	} else if (id.includes(phrase) || name.includes(phrase)) {
		score += 200;
	}

	const description = feature.description.toLowerCase();

	for (const token of tokens) {
		if (name.includes(token) || id.includes(token)) {
			score += 40;
		} else if (description.includes(token)) {
			score += 8;
		} else {
			return score;
		}
	}

	return score;
}

function describeFeature(feature: WebFeature) {
	return {
		baseline: feature.baseline,
		baselineHigh: feature.high ?? null,
		baselineLow: feature.low ?? null,
		description: feature.description,
		group: feature.group ?? null,
		id: feature.id,
		name: feature.name,
		specifications: feature.spec ?? [],
		support: feature.support,
		url: `https://webstatus.dev/features/${feature.id}`,
	};
}

function searchFeatures(input: string) {
	const phrase = normalise(readQuery(input));
	const tokens = phrase.split(" ").slice(0, MAX_QUERY_TOKENS);
	const matches = WEB_FEATURES.map((feature) => ({
		feature,
		score: scoreFeature(feature, phrase, tokens),
	}))
		.filter((match) => match.score >= 40)
		.toSorted(
			(left, right) => right.score - left.score || left.feature.id.localeCompare(right.feature.id),
		)
		.slice(0, MAX_MATCHES);

	return {
		attribution: ATTRIBUTION.baseline,
		matches: matches.map((match) => describeFeature(match.feature)),
		query: input.trim(),
	};
}

function findFeature(input: string) {
	const id = readQuery(input).toLowerCase();
	const feature = WEB_FEATURES.find((candidate) => candidate.id === id);

	if (!feature) {
		throw new WebPlatformError(
			`No feature with the id "${id}". Use the baseline mode to search by name.`,
			404,
		);
	}

	return { attribution: ATTRIBUTION.baseline, feature: describeFeature(feature) };
}

function nullableString(value: unknown) {
	return typeof value === "string" ? value : null;
}

function describeRelease(release: unknown) {
	if (!isRecord(release)) {
		return undefined;
	}

	const name = nullableString(release.name);

	if (!name) {
		return undefined;
	}

	const latest = isRecord(release.latest) ? release.latest : undefined;

	return {
		endOfActiveSupport: nullableString(release.eoasFrom),
		endOfLife: nullableString(release.eolFrom),
		label: nullableString(release.label) ?? name,
		latest: nullableString(latest?.name),
		longTermSupport: release.isLts === true,
		release: name,
		releaseDate: nullableString(release.releaseDate),
		supported: release.isMaintained === true,
	};
}

function parseProductInput(input: string) {
	const [product = "", release] = input
		.trim()
		.toLowerCase()
		.split(/[\s@]+/)
		.filter(Boolean);

	if (!PRODUCT_PATTERN.test(product)) {
		throw new WebPlatformError(
			"Enter a product such as nodejs, python or react, optionally followed by a release.",
		);
	}

	return { product, release };
}

async function endOfLife(input: string) {
	const { product, release } = parseProductInput(input);
	let result: Awaited<ReturnType<typeof fetchCachedJson>>;

	try {
		result = await fetchCachedJson(`${EOL_API}/${product}`, {
			maxBytes: EOL_MAX_BYTES,
			source: "endoflife.date",
			timeoutMs: EOL_TIMEOUT_MS,
			ttlSeconds: EOL_TTL_SECONDS,
		});
	} catch (error) {
		if (error instanceof UpstreamError) {
			throw new WebPlatformError(error.message, error.status);
		}

		throw error;
	}

	if (result.status !== 200) {
		throw new WebPlatformError(`endoflife.date has no product "${product}".`, 404);
	}

	const body = isRecord(result.body) ? result.body : undefined;
	const details = isRecord(body?.result) ? body.result : undefined;

	if (!details || !Array.isArray(details.releases)) {
		throw new WebPlatformError("endoflife.date returned an unexpected response.", 502);
	}

	const releases = details.releases
		.map(describeRelease)
		.filter((entry) => entry !== undefined)
		.filter(
			(entry) =>
				!release ||
				entry.release.toLowerCase() === release ||
				entry.release.toLowerCase().startsWith(`${release}.`),
		);

	if (release && releases.length === 0) {
		throw new WebPlatformError(`No release "${release}" listed for ${product}.`, 404);
	}

	const links = isRecord(details.links) ? details.links : undefined;

	return {
		attribution: ATTRIBUTION["end-of-life"],
		product,
		productName: nullableString(details.label) ?? product,
		releasePolicy: nullableString(links?.releasePolicy),
		releases: releases.slice(0, MAX_RELEASES),
		url: `https://endoflife.date/${product}`,
	};
}

export async function lookupWebPlatform(input: string, format: WebPlatformFormat) {
	switch (format) {
		case "baseline":
			return searchFeatures(input);
		case "feature":
			return findFeature(input);
		case "end-of-life":
			return endOfLife(input);
		default:
			throw new WebPlatformError("Unsupported lookup mode.");
	}
}
