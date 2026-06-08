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
	const urls = ["/", ...listGeneratorTools().map((tool) => `/${tool.id}`)];
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

function escapeXml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;")
		.replaceAll("'", "&apos;");
}
