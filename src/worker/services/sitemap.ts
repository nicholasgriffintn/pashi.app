import { appPagePath } from "../../shared/app-previews";
import { listAppPreviews } from "../mcp/app-previews";
import { escapeXml } from "../utils/text";
import { listConverterTools } from "./converters";
import { listGeneratorTools } from "./generators/index";

export function createSitemapResponse(origin: string) {
	return new Response(createSitemapXml(origin), {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"X-Content-Type-Options": "nosniff",
		},
	});
}

function createSitemapXml(origin: string) {
	const urls = [
		"/",
		"/tools",
		"/labs",
		"/labs/ask",
		"/labs/explain",
		"/labs/apps",
		...listAppPreviews().map((preview) => appPagePath(preview.id)),
		"/labs/decide",
		"/about",
		"/privacy",
		"/api",
		...listGeneratorTools().map((tool) => `/tools/${tool.id}`),
		...listConverterTools().map((tool) => `/tools/convert/${tool.id}`),
	];
	const entries = urls
		.map(
			(path) => `  <url>
    <loc>${escapeXml(`${origin}${path}`)}</loc>
  </url>`,
		)
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}
