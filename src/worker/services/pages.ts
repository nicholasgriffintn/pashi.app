import {
	APP_PAGE_PREFIX,
	CONVERTER_PAGE_PREFIX,
	fullPageTitle,
	GENERATOR_PAGE_PREFIX,
	isStaticPagePath,
	type PageMetadata,
	STATIC_PAGES,
} from "../../shared/pages";
import { escapeXml } from "../utils/text";
import { findConverterTool, listConverterTools } from "./converters/catalogue";
import type { ConverterTool } from "./converters/types";
import { findGenerator, listGeneratorTools } from "./generators/catalogue";
import type { GeneratorTool } from "./generators/types";

interface PageLink {
	href: string;
	label: string;
}

export interface PageDescription extends PageMetadata {
	canonicalPath: string;
	details: readonly string[];
	links: readonly PageLink[];
}

const SECTION_LINKS: readonly PageLink[] = [
	{ href: "/tools", label: "Tools" },
	{ href: "/labs", label: "Labs" },
	{ href: "/api", label: "API" },
	{ href: "/about", label: "About" },
];

const NOT_FOUND_PAGE: PageMetadata = {
	description: "This page does not exist.",
	title: "Not found",
};

function generatorPath(tool: GeneratorTool) {
	return `${GENERATOR_PAGE_PREFIX}${tool.id}`;
}

function converterPath(tool: ConverterTool) {
	return `${CONVERTER_PAGE_PREFIX}${tool.id}`;
}

function toolLinks(): PageLink[] {
	return [
		...listGeneratorTools().map((tool) => ({ href: generatorPath(tool), label: tool.label })),
		...listConverterTools().map((tool) => ({ href: converterPath(tool), label: tool.label })),
	];
}

function describeGenerator(tool: GeneratorTool): PageDescription {
	const fields = tool.input.fields ?? [];

	return {
		canonicalPath: generatorPath(tool),
		description: tool.description,
		details: [
			`API: GET ${tool.endpoint}`,
			...(fields.length > 0 ? [`Fields: ${fields.map((field) => field.id).join(", ")}`] : []),
		],
		links: SECTION_LINKS,
		title: tool.label,
	};
}

function describeConverter(tool: ConverterTool): PageDescription {
	const fields = tool.api?.fields ?? [];

	return {
		canonicalPath: converterPath(tool),
		description: tool.description,
		details: [
			...(tool.endpoint ? [`API: POST ${tool.endpoint}`] : []),
			`Outputs: ${tool.outputs.join(", ")}`,
			...fields.map((field) => `${field.id}: ${field.description}`),
		],
		links: SECTION_LINKS,
		title: tool.label,
	};
}

function singleSegmentAfter(pathname: string, prefix: string) {
	const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";

	return rest && !rest.includes("/") ? decodeURIComponent(rest) : undefined;
}

function normalisePathname(pathname: string) {
	return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function describePage(rawPathname: string): PageDescription | undefined {
	const pathname = normalisePathname(rawPathname);

	if (isStaticPagePath(pathname)) {
		return {
			...STATIC_PAGES[pathname],
			canonicalPath: pathname,
			details: [],
			links: pathname === "/tools" ? toolLinks() : SECTION_LINKS,
		};
	}

	const converterId = singleSegmentAfter(pathname, CONVERTER_PAGE_PREFIX);
	const converter = converterId ? findConverterTool(converterId) : undefined;

	if (converter) {
		return describeConverter(converter);
	}

	const generatorId = singleSegmentAfter(pathname, GENERATOR_PAGE_PREFIX);
	const generator = generatorId ? findGenerator(generatorId) : undefined;

	if (generator) {
		return describeGenerator(generator);
	}

	if (singleSegmentAfter(pathname, APP_PAGE_PREFIX)) {
		return {
			...STATIC_PAGES["/labs/apps"],
			canonicalPath: pathname,
			details: [],
			links: SECTION_LINKS,
		};
	}

	return undefined;
}

function renderFallbackContent(
	page: PageMetadata,
	details: readonly string[],
	links: readonly PageLink[],
) {
	const detailItems = details.map((detail) => `<li>${escapeXml(detail)}</li>`).join("");
	const linkItems = links
		.map((link) => `<li><a href="${escapeXml(link.href)}">${escapeXml(link.label)}</a></li>`)
		.join("");

	return [
		"<noscript><main>",
		`<h1>${escapeXml(page.title)}</h1>`,
		`<p>${escapeXml(page.description)}</p>`,
		detailItems ? `<ul>${detailItems}</ul>` : "",
		linkItems ? `<nav><ul>${linkItems}</ul></nav>` : "",
		"</main></noscript>",
	].join("");
}

function setContent(content: string): HTMLRewriterElementContentHandlers {
	return {
		element(element) {
			element.setAttribute("content", content);
		},
	};
}

export function renderPage(shell: Response, origin: string, pathname: string) {
	const page = describePage(pathname);
	const metadata = page ?? NOT_FOUND_PAGE;
	const title = fullPageTitle(metadata.title);
	const headTags = page
		? `<link rel="canonical" href="${escapeXml(`${origin}${page.canonicalPath}`)}" />`
		: '<meta name="robots" content="noindex" />';
	const rewritten = new HTMLRewriter()
		.on("title", {
			element(element) {
				element.setInnerContent(title);
			},
		})
		.on('meta[name="description"]', setContent(metadata.description))
		.on('meta[property="og:title"]', setContent(title))
		.on('meta[property="og:description"]', setContent(metadata.description))
		.on("head", {
			element(element) {
				element.append(headTags, { html: true });
			},
		})
		.on("body", {
			element(element) {
				element.prepend(
					renderFallbackContent(metadata, page?.details ?? [], page?.links ?? SECTION_LINKS),
					{ html: true },
				);
			},
		})
		.transform(shell);

	return new Response(rewritten.body, { headers: rewritten.headers, status: page ? 200 : 404 });
}

export function createRobotsResponse(origin: string) {
	return new Response(
		[
			"User-agent: *",
			"Allow: /",
			"Disallow: /api/",
			"Disallow: /export/",
			"Disallow: /mcp",
			"Disallow: /view/",
			`Sitemap: ${origin}/sitemap.xml`,
			"",
		].join("\n"),
		{ headers: { "Content-Type": "text/plain; charset=utf-8" } },
	);
}

function toolLine(origin: string, path: string, label: string, description: string) {
	return `- [${label}](${origin}${path}): ${description}`;
}

export function createLlmsTextResponse(origin: string) {
	const lines = [
		"# Pashi",
		"",
		`> ${STATIC_PAGES["/"].description}`,
		"",
		"## Using it",
		"",
		`- [API documentation](${origin}/api): every tool is a URL under ${origin}/api/`,
		`- [OpenAPI document](${origin}/api/openapi.json)`,
		`- [Tool catalogue as JSON](${origin}/api/info)`,
		`- MCP server: ${origin}/mcp (the generator and converter toolkit works without an account)`,
		"",
		"## Generators",
		"",
		...listGeneratorTools().map((tool) =>
			toolLine(origin, generatorPath(tool), tool.label, tool.description),
		),
		"",
		"## Converters",
		"",
		...listConverterTools().map((tool) =>
			toolLine(origin, converterPath(tool), tool.label, tool.description),
		),
		"",
	];

	return new Response(lines.join("\n"), {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}
