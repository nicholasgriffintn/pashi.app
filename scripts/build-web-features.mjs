import { writeFile } from "node:fs/promises";

const REGISTRY = "https://registry.npmjs.org/web-features";
const OUTPUT = new URL("../src/worker/services/converters/data/web-features.ts", import.meta.url);
const MAX_DESCRIPTION = 280;
const MAX_SPECS = 2;
const BROWSERS = [
	"chrome",
	"chrome_android",
	"edge",
	"firefox",
	"firefox_android",
	"safari",
	"safari_ios",
];

async function fetchJson(url) {
	const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });

	if (!response.ok) {
		throw new Error(`${url} responded ${response.status}`);
	}

	return response.json();
}

function trim(text) {
	const value = (text ?? "").replace(/\s+/g, " ").trim();

	return value.length > MAX_DESCRIPTION ? `${value.slice(0, MAX_DESCRIPTION - 1)}…` : value;
}

function toRecord(id, feature, groups) {
	const { status } = feature;
	const support = Object.fromEntries(
		BROWSERS.filter((browser) => status.support?.[browser]).map((browser) => [
			browser,
			status.support[browser],
		]),
	);
	const groupId = Array.isArray(feature.group) ? feature.group[0] : feature.group;
	const specs = [feature.spec ?? []].flat().slice(0, MAX_SPECS);
	const record = {
		id,
		name: feature.name,
		description: trim(feature.description),
		baseline: status.baseline,
		...(status.baseline_low_date ? { low: status.baseline_low_date } : {}),
		...(status.baseline_high_date ? { high: status.baseline_high_date } : {}),
		support,
		...(groupId && groups[groupId] ? { group: groups[groupId].name } : {}),
		...(specs.length > 0 ? { spec: specs } : {}),
	};

	return record;
}

const requested = process.argv[2];
const version = requested ?? (await fetchJson(`${REGISTRY}/latest`)).version;
const data = await fetchJson(`https://cdn.jsdelivr.net/npm/web-features@${version}/data.json`);
const records = Object.entries(data.features)
	.filter(([, feature]) => feature.kind === "feature")
	.map(([id, feature]) => toRecord(id, feature, data.groups))
	.toSorted((left, right) => left.id.localeCompare(right.id));

const source = `export type WebFeatureBaseline = "high" | "low" | false;

export type WebFeatureBrowser =
	| "chrome"
	| "chrome_android"
	| "edge"
	| "firefox"
	| "firefox_android"
	| "safari"
	| "safari_ios";

export interface WebFeature {
	baseline: WebFeatureBaseline;
	description: string;
	group?: string;
	high?: string;
	id: string;
	low?: string;
	name: string;
	spec?: readonly string[];
	support: Partial<Record<WebFeatureBrowser, string>>;
}

export const WEB_FEATURES_VERSION = ${JSON.stringify(version)};

export const WEB_FEATURES_SOURCE = "https://github.com/web-platform-dx/web-features";

export const WEB_FEATURES_LICENCE =
	"web-features dataset by the WebDX Community Group, licensed under Apache-2.0";

export const WEB_FEATURES: readonly WebFeature[] = [
${records.map((record) => `\t${JSON.stringify(record)},`).join("\n")}
];
`;

await writeFile(OUTPUT, source);
console.log(`web-features ${version}: ${records.length} features, ${source.length} bytes`);
