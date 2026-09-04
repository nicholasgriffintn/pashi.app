export type ProjectStatus = "archived" | "lab" | "live";

export interface Project {
	blurb: string;
	external?: boolean;
	id: string;
	name: string;
	shipped: string;
	stack: readonly string[];
	status: ProjectStatus;
	url: string;
}

export const PROJECTS: readonly Project[] = [
	{
		blurb:
			"Generators and converters for the formats you touch every day. UUIDs, QR codes, dice odds, Slack emoji, document and media conversion.",
		id: "tools",
		name: "Tools",
		shipped: "2026-09",
		stack: ["Workers", "Containers", "R2"],
		status: "live",
		url: "/tools",
	},
	{
		blurb:
			"Where the AI work happens. Describe what you need in plain words, get explanations for the formats Pashi already parses, and let agents call the toolkit.",
		id: "labs",
		name: "Labs",
		shipped: "2026-09",
		stack: ["Workers AI", "MCP"],
		status: "lab",
		url: "/labs",
	},
	{
		blurb:
			"Find films and television across your streaming services, get tailored recommendations, and keep your own shelf.",
		external: true,
		id: "marquee",
		name: "Marquee",
		shipped: "2026-09",
		stack: ["Hyperdrive", "Vectorize", "Workflows"],
		status: "live",
		url: "https://marquee.pashi.app",
	},
];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
	archived: "Archived",
	lab: "Lab",
	live: "Live",
};
