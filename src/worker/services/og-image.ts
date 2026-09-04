import { escapeXml } from "../utils/text";
import { listConverterTools } from "./converters/catalogue";
import { listGeneratorTools } from "./generators/catalogue";

const WIDTH = 1200;
const HEIGHT = 630;
const MAX_TITLE_LENGTH = 34;

interface OgSubject {
	eyebrow: string;
	subtitle: string;
	title: string;
}

const PAGE_SUBJECTS: Record<string, OgSubject> = {
	"": {
		eyebrow: "pashi.app",
		subtitle: "Small tools, running experiments, and the odd whole app.",
		title: "Pashi",
	},
	about: {
		eyebrow: "pashi.app",
		subtitle: "What Pashi is, and how it runs on Cloudflare.",
		title: "About",
	},
	api: {
		eyebrow: "pashi.app / api",
		subtitle: "Every tool is a URL. Generators, converters and exports.",
		title: "API",
	},
	labs: {
		eyebrow: "pashi.app / labs",
		subtitle: "Plain English tool routing, format explainers and agent access.",
		title: "Labs",
	},
	tools: {
		eyebrow: "pashi.app / tools",
		subtitle: "Generators and converters for the formats you touch every day.",
		title: "Tools",
	},
};

function wrapText(value: string, perLine: number, maxLines: number) {
	const words = value.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let current = "";

	for (const word of words) {
		const candidate = current ? `${current} ${word}` : word;

		if (candidate.length > perLine && current) {
			lines.push(current);
			current = word;
		} else {
			current = candidate;
		}

		if (lines.length === maxLines) {
			break;
		}
	}

	if (current && lines.length < maxLines) {
		lines.push(current);
	}

	return lines;
}

function subjectForPath(pathname: string): OgSubject {
	const segments = pathname.split("/").filter(Boolean);
	const [first, second, third] = segments;

	if (!first) {
		return PAGE_SUBJECTS[""];
	}

	if (first === "tools" && second) {
		const toolId = second === "convert" ? third : second;
		const converter = toolId
			? listConverterTools().find((tool) => tool.id === toolId || tool.aliases.includes(toolId))
			: undefined;
		const generator = toolId
			? listGeneratorTools().find((tool) => tool.id === toolId || tool.aliases.includes(toolId))
			: undefined;
		const tool = second === "convert" ? converter : (generator ?? converter);

		if (tool) {
			return {
				eyebrow: `pashi.app / ${tool.display.category.toLowerCase()}`,
				subtitle: tool.description,
				title: tool.label,
			};
		}
	}

	return PAGE_SUBJECTS[first] ?? PAGE_SUBJECTS[""];
}

function titleFontSize(title: string) {
	if (title.length <= 12) {
		return 148;
	}

	return title.length <= 22 ? 104 : 76;
}

export function createOgImageSvg(pathname: string) {
	const subject = subjectForPath(pathname);
	const title =
		subject.title.length > MAX_TITLE_LENGTH
			? `${subject.title.slice(0, MAX_TITLE_LENGTH - 1)}…`
			: subject.title;
	const size = titleFontSize(title);
	const subtitleLines = wrapText(subject.subtitle, 52, 3);

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(title)}">
	<defs>
		<linearGradient id="ground" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="#0d1024"/>
			<stop offset="45%" stop-color="#151326"/>
			<stop offset="100%" stop-color="#250f18"/>
		</linearGradient>
		<pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
			<path d="M42 0H0V42" fill="none" stroke="#fff7d7" stroke-opacity="0.05" stroke-width="1"/>
		</pattern>
	</defs>
	<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#ground)"/>
	<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)"/>
	<circle cx="980" cy="120" r="260" fill="#ff2f78" fill-opacity="0.16"/>
	<rect x="72" y="${HEIGHT - 96}" width="${WIDTH - 144}" height="6" fill="#25ffe6"/>
	<text x="72" y="132" font-family="Menlo, monospace" font-size="26" letter-spacing="4" fill="#25ffe6">${escapeXml(subject.eyebrow.toUpperCase())}</text>
	<text x="72" y="${size + 210}" font-family="Impact, 'Arial Black', sans-serif" font-size="${size}" fill="#fff7d7" letter-spacing="1">${escapeXml(title.toUpperCase())}</text>
	${subtitleLines
		.map(
			(line, index) =>
				`<text x="72" y="${size + 286 + index * 46}" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#f0d9bb">${escapeXml(line)}</text>`,
		)
		.join("\n\t")}
</svg>`;
}

export function createOgImageResponse(pathname: string) {
	return new Response(createOgImageSvg(pathname), {
		headers: {
			"Cache-Control": "public, max-age=86400",
			"Content-Type": "image/svg+xml; charset=utf-8",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
