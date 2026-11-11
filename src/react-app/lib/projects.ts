export type ProjectStatus = "archived" | "lab" | "live";
export type ProjectKind = "app" | "extension" | "project";

export interface Project {
	blurb: string;
	external?: boolean;
	id: string;
	kind: ProjectKind;
	name: string;
	stack: readonly string[];
	status: ProjectStatus;
	url: string;
}

export const PROJECTS: readonly Project[] = [
	{
		blurb:
			"Generators and converters for the formats you touch every day. UUIDs, QR codes, dice odds, Slack emoji, document and media conversion.",
		id: "tools",
		kind: "project",
		name: "Tools",
		stack: ["Workers", "Containers", "R2"],
		status: "live",
		url: "/tools",
	},
	{
		blurb:
			"Where the AI work happens. Describe what you need in plain words, get explanations for the formats Pashi already parses, and let agents call the toolkit.",
		id: "labs",
		kind: "project",
		name: "Labs",
		stack: ["Polychat", "MCP"],
		status: "lab",
		url: "/labs",
	},
	{
		blurb:
			"Full-page snapshots of news and sport sites, captured on a schedule and kept over time to track headlines and layouts.",
		external: true,
		id: "news-snapshotter",
		kind: "project",
		name: "News Snapshotter",
		stack: ["Browser Rendering", "Workflows", "R2"],
		status: "live",
		url: "https://news-snapshotter.pashi.app",
	},
	{
		blurb:
			"Chromatic-style visual snapshot testing for Playwright, self-hosted on your own Cloudflare account.",
		external: true,
		id: "playwright-visual-cloud",
		kind: "project",
		name: "Visual Cloud",
		stack: ["Playwright", "D1", "R2"],
		status: "live",
		url: "https://pvc.pashi.app",
	},
	{
		blurb:
			"Blur sensitive data, distracting media and selected page content, with reusable profiles per site.",
		external: true,
		id: "blur",
		kind: "extension",
		name: "Blur",
		stack: ["Chrome"],
		status: "live",
		url: "https://blur.pashi.app",
	},
	{
		blurb:
			"Make application environments unmistakable and stop destructive production actions before they happen.",
		external: true,
		id: "environment-guard",
		kind: "extension",
		name: "Environment Guard",
		stack: ["Chrome"],
		status: "live",
		url: "https://environment-guard.pashi.app",
	},
	{
		blurb: "Inspect GraphQL requests, responses and subscriptions without leaving Chrome DevTools.",
		external: true,
		id: "graphql-inspector",
		kind: "extension",
		name: "GraphQL Inspector",
		stack: ["Chrome", "DevTools"],
		status: "live",
		url: "https://graphql-inspector.pashi.app",
	},
	{
		blurb: "Manage HTTP request and response header rules locally, with profiles and URL filters.",
		external: true,
		id: "header-forge",
		kind: "extension",
		name: "Header Forge",
		stack: ["Chrome"],
		status: "live",
		url: "https://header-forge.pashi.app",
	},
	{
		blurb:
			"Pop the best video in your current tab into an always-on-top Picture-in-Picture window.",
		external: true,
		id: "pip-everywhere",
		kind: "extension",
		name: "PiP Everywhere",
		stack: ["Chrome"],
		status: "live",
		url: "https://pip-everywhere.pashi.app",
	},
	{
		blurb:
			"Readable, customisable subtitles for YouTube, Netflix, BBC iPlayer, Disney+ and Prime Video.",
		external: true,
		id: "subtle",
		kind: "extension",
		name: "Subtle",
		stack: ["Chrome"],
		status: "live",
		url: "https://subtle.pashi.app",
	},
];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
	archived: "Archived",
	lab: "Lab",
	live: "Live",
};
