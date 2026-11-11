export interface PageMetadata {
	description: string;
	title: string;
}

export const SITE_NAME = "Pashi";

export const DEFAULT_PAGE_DESCRIPTION =
	"Pashi is the home for side projects: generators, converters and AI experiments.";

export const STATIC_PAGES = {
	"/": { description: DEFAULT_PAGE_DESCRIPTION, title: SITE_NAME },
	"/about": { description: "What Pashi is, and how it runs on Cloudflare.", title: "About" },
	"/api": {
		description: "Every Pashi tool as a URL. Generators, converters and export formats.",
		title: "API",
	},
	"/labs": {
		description:
			"AI experiments in Pashi: plain English tool routing, format explainers, typed decisions and MCP Apps.",
		title: "Labs",
	},
	"/labs/apps": { description: "Pashi's MCP Apps, playable in the browser.", title: "Apps" },
	"/labs/ask": {
		description:
			"Describe what you need and Pashi picks the tool, runs it when it is simple and otherwise opens it with the form filled in.",
		title: "Ask Pashi",
	},
	"/labs/decide": {
		description:
			"Ask a decision model typed questions about some text or an image: yes or no, choices and scores.",
		title: "Decide",
	},
	"/labs/explain": {
		description:
			"Plain English for regular expressions, cron schedules, JWTs, curl commands and SQL.",
		title: "Explainers",
	},
	"/privacy": {
		description: "What Pashi stores, records and sends to other services.",
		title: "Privacy",
	},
	"/sign-in": {
		description: "Connect Polychat to use AI and media conversion in Pashi.",
		title: "Sign in",
	},
	"/tools": {
		description: "Generate UUIDs, tokens, colours, test data and more.",
		title: "Generators",
	},
} as const satisfies Record<string, PageMetadata>;

export type StaticPagePath = keyof typeof STATIC_PAGES;

export const APP_PAGE_PREFIX = "/labs/apps/";
export const GENERATOR_PAGE_PREFIX = "/tools/";
export const CONVERTER_PAGE_PREFIX = "/tools/convert/";

export function isStaticPagePath(pathname: string): pathname is StaticPagePath {
	return Object.hasOwn(STATIC_PAGES, pathname);
}

export function fullPageTitle(title: string) {
	return title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`;
}
