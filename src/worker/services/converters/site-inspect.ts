import { DNS_RECORD_TYPES, lookupDns } from "../../utils/dns-over-https.ts";
import {
	fetchPublic,
	normaliseInspectableUrl,
	PublicFetchError,
} from "../../utils/public-fetch.ts";

export const SITE_INSPECT_FORMATS = ["preview", "headers", "redirects", "dns", "robots"] as const;

export type SiteInspectFormat = (typeof SITE_INSPECT_FORMATS)[number];

export class SiteInspectError extends Error {
	readonly status: number;

	constructor(message: string, status = 422) {
		super(message);
		this.status = status;
	}
}

const PAGE_BYTES = 512 * 1024;
const ROBOTS_BYTES = 128 * 1024;
const MAX_ICONS = 8;
const MAX_ROBOTS_GROUPS = 12;
const MAX_RULES_PER_GROUP = 20;
const MAX_TEXT = 500;

const SECURITY_HEADERS = [
	{
		advice: "Tells browsers to use HTTPS for every visit.",
		name: "strict-transport-security",
	},
	{
		advice: "Limits where scripts, styles and frames can load from.",
		name: "content-security-policy",
	},
	{
		advice: "Stops browsers guessing content types. Expected value: nosniff.",
		name: "x-content-type-options",
	},
	{
		advice: "Controls framing. CSP frame-ancestors also covers this.",
		name: "x-frame-options",
	},
	{
		advice: "Controls how much of the URL is sent to other sites.",
		name: "referrer-policy",
	},
	{
		advice: "Turns off browser features the site does not use.",
		name: "permissions-policy",
	},
] as const;

export function isSiteInspectFormat(value: string | undefined): value is SiteInspectFormat {
	return SITE_INSPECT_FORMATS.some((format) => format === value);
}

function clip(value: string | undefined) {
	const text = value?.replace(/\s+/g, " ").trim();

	if (!text) {
		return undefined;
	}

	return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
}

function absolute(value: string | undefined, base: URL) {
	if (!value) {
		return undefined;
	}

	try {
		return new URL(value, base).href;
	} catch {
		return undefined;
	}
}

async function readPreview(url: URL) {
	const page = await fetchPublic(url, { accept: "text/html", maxBodyBytes: PAGE_BYTES });
	const meta = new Map<string, string>();
	const icons: { href: string; rel: string; sizes?: string }[] = [];
	const found: { canonical?: string; lang?: string; manifest?: string; title: string } = {
		title: "",
	};

	const rewriter = new HTMLRewriter()
		.on("html", {
			element(element) {
				found.lang = element.getAttribute("lang") ?? undefined;
			},
		})
		.on("head title", {
			text(text) {
				found.title += text.text;
			},
		})
		.on("meta", {
			element(element) {
				const key = (
					element.getAttribute("property") ?? element.getAttribute("name")
				)?.toLowerCase();
				const content = element.getAttribute("content");

				if (key && content && !meta.has(key)) {
					meta.set(key, content);
				}
			},
		})
		.on("link", {
			element(element) {
				const rel = element.getAttribute("rel")?.toLowerCase() ?? "";
				const href = element.getAttribute("href") ?? undefined;

				if (rel.split(/\s+/).includes("canonical")) {
					found.canonical = href;
				}

				if (rel.split(/\s+/).includes("manifest")) {
					found.manifest = href;
				}

				if (rel.includes("icon") && href && icons.length < MAX_ICONS) {
					icons.push({ href, rel, sizes: element.getAttribute("sizes") ?? undefined });
				}
			},
		});

	await rewriter
		.transform(new Response(page.body, { headers: { "Content-Type": "text/html" } }))
		.text();

	const base = page.finalUrl;

	return {
		canonical: absolute(found.canonical, base),
		contentType: page.headers.get("Content-Type") ?? undefined,
		description: clip(meta.get("description") ?? meta.get("og:description")),
		finalUrl: base.href,
		icons: icons.map((icon) => ({ ...icon, href: absolute(icon.href, base) })),
		language: found.lang,
		manifest: absolute(found.manifest, base),
		openGraph: {
			description: clip(meta.get("og:description")),
			image: absolute(meta.get("og:image"), base),
			siteName: clip(meta.get("og:site_name")),
			title: clip(meta.get("og:title")),
			type: clip(meta.get("og:type")),
			url: absolute(meta.get("og:url"), base),
		},
		status: page.status,
		themeColour: clip(meta.get("theme-color")),
		title: clip(found.title),
		truncated: page.bodyTruncated,
		twitter: {
			card: clip(meta.get("twitter:card")),
			description: clip(meta.get("twitter:description")),
			image: absolute(meta.get("twitter:image"), base),
			title: clip(meta.get("twitter:title")),
		},
	};
}

async function readHeaders(url: URL) {
	const page = await fetchPublic(url, { maxBodyBytes: 0 });
	const headers = page.headers;
	const csp = headers.get("content-security-policy") ?? "";
	const checks = SECURITY_HEADERS.map(({ advice, name }) => {
		const value = headers.get(name) ?? undefined;
		const coveredByCsp = name === "x-frame-options" && /frame-ancestors/i.test(csp);

		return {
			advice,
			header: name,
			present: Boolean(value) || coveredByCsp,
			value: clip(value) ?? (coveredByCsp ? "Covered by CSP frame-ancestors" : undefined),
		};
	});
	const isHttps = page.finalUrl.protocol === "https:";

	return {
		finalUrl: page.finalUrl.href,
		https: isHttps,
		other: Object.fromEntries(
			["server", "cache-control", "content-type", "x-powered-by", "alt-svc"].flatMap((name) => {
				const value = headers.get(name);

				return value ? [[name, clip(value)]] : [];
			}),
		),
		score: `${checks.filter((check) => check.present).length} of ${checks.length} security headers present`,
		security: checks,
		status: page.status,
	};
}

async function readRedirects(url: URL) {
	const page = await fetchPublic(url, { maxBodyBytes: 0 });

	return {
		finalStatus: page.status,
		finalUrl: page.finalUrl.href,
		hops: page.hops,
		redirects: page.hops.length - 1,
		upgradesToHttps: url.protocol === "http:" && page.finalUrl.protocol === "https:",
	};
}

async function readDns(url: URL) {
	const lookups = await Promise.all(
		DNS_RECORD_TYPES.map(async (type) => [type, await lookupDns(url.hostname, type)] as const),
	);

	if (lookups.every(([, lookup]) => lookup.status === "no-domain")) {
		throw new SiteInspectError(`${url.hostname} does not exist in DNS.`);
	}

	return {
		hostname: url.hostname,
		records: Object.fromEntries(
			lookups.map(([type, lookup]) => [
				type,
				lookup.status === "error"
					? "Lookup failed"
					: lookup.answers.filter((answer) => answer.type === type).map((answer) => answer.data),
			]),
		),
		resolver: "Cloudflare DNS over HTTPS",
	};
}

interface RobotsGroup {
	allow: string[];
	crawlDelay?: string;
	disallow: string[];
	userAgents: string[];
}

function parseRobots(text: string) {
	const groups: RobotsGroup[] = [];
	const sitemaps: string[] = [];
	let current: RobotsGroup | undefined;
	let lastWasAgent = false;

	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.replace(/#.*/, "").trim();
		const separator = line.indexOf(":");

		if (separator < 1) {
			continue;
		}

		const key = line.slice(0, separator).trim().toLowerCase();
		const value = line.slice(separator + 1).trim();

		if (key === "sitemap") {
			sitemaps.push(value);
			continue;
		}

		if (key === "user-agent") {
			if (!current || !lastWasAgent) {
				current = { allow: [], disallow: [], userAgents: [] };
				groups.push(current);
			}

			current.userAgents.push(value);
			lastWasAgent = true;
			continue;
		}

		lastWasAgent = false;

		if (!current) {
			continue;
		}

		if (key === "allow" && current.allow.length < MAX_RULES_PER_GROUP) {
			current.allow.push(value);
		} else if (key === "disallow" && current.disallow.length < MAX_RULES_PER_GROUP) {
			current.disallow.push(value);
		} else if (key === "crawl-delay") {
			current.crawlDelay = value;
		}
	}

	return { groups: groups.slice(0, MAX_ROBOTS_GROUPS), sitemaps: sitemaps.slice(0, MAX_ICONS) };
}

async function readRobots(url: URL) {
	const robotsUrl = new URL("/robots.txt", url.origin);
	const page = await fetchPublic(robotsUrl, { accept: "text/plain", maxBodyBytes: ROBOTS_BYTES });

	if (page.status === 404 || page.status === 410) {
		return {
			found: false,
			robotsUrl: robotsUrl.href,
			summary: "No robots.txt. Crawlers may fetch everything.",
		};
	}

	if (page.status >= 400) {
		throw new SiteInspectError(`robots.txt returned HTTP ${page.status}.`, 502);
	}

	const parsed = parseRobots(page.body);
	const everyone = parsed.groups.find((group) => group.userAgents.includes("*"));

	return {
		found: true,
		groups: parsed.groups,
		robotsUrl: page.finalUrl.href,
		sitemaps: parsed.sitemaps,
		summary: everyone?.disallow.includes("/")
			? "All crawlers are asked to stay out of the whole site."
			: `${parsed.groups.length} user-agent group${parsed.groups.length === 1 ? "" : "s"}, ${parsed.sitemaps.length} sitemap${parsed.sitemaps.length === 1 ? "" : "s"}.`,
		truncated: page.bodyTruncated,
	};
}

const READERS: Record<SiteInspectFormat, (url: URL) => Promise<unknown>> = {
	dns: readDns,
	headers: readHeaders,
	preview: readPreview,
	redirects: readRedirects,
	robots: readRobots,
};

export async function inspectSite(input: string, format: SiteInspectFormat) {
	try {
		const url = normaliseInspectableUrl(input);

		return JSON.stringify(await READERS[format](url), null, 2);
	} catch (error) {
		if (error instanceof PublicFetchError) {
			throw new SiteInspectError(error.message, error.status);
		}

		throw error;
	}
}
