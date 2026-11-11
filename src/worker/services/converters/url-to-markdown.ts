import {
	fetchPublic,
	normaliseInspectableUrl,
	PublicFetchError,
} from "../../utils/public-fetch.ts";

export class UrlToMarkdownError extends Error {
	readonly status: number;

	constructor(message: string, status = 422) {
		super(message);
		this.status = status;
	}
}

const PAGE_BYTES = 1024 * 1024;
const MAX_TITLE = 300;
const HTML_TYPE = /^(text\/html|application\/xhtml\+xml)\b/i;

async function readTitle(html: string) {
	let title = "";

	await new HTMLRewriter()
		.on("head title", {
			text(chunk) {
				title += chunk.text;
			},
		})
		.transform(new Response(html))
		.text();

	const clean = title.replace(/\s+/g, " ").trim();

	return clean.length > MAX_TITLE ? `${clean.slice(0, MAX_TITLE)}…` : clean;
}

async function requestMarkdown(ai: Ai, html: string) {
	const failure = new UrlToMarkdownError("The page could not be converted to Markdown.");
	let response: ConversionResponse;

	try {
		response = await ai.toMarkdown(
			{ blob: new Blob([html], { type: "text/html" }), name: "page.html" },
			{ conversionOptions: { html: { images: { convert: false, convertOGImage: false } } } },
		);
	} catch {
		throw failure;
	}

	if (response.format === "error") {
		throw failure;
	}

	return response;
}

export async function convertUrlToMarkdown(ai: Ai, input: string) {
	try {
		const page = await fetchPublic(normaliseInspectableUrl(input), {
			accept: "text/html,application/xhtml+xml",
			maxBodyBytes: PAGE_BYTES,
		});

		if (page.status >= 400) {
			throw new UrlToMarkdownError(`The page responded with HTTP ${page.status}.`, 502);
		}

		const contentType = page.headers.get("Content-Type") ?? "";

		if (!HTML_TYPE.test(contentType)) {
			throw new UrlToMarkdownError(
				`Only HTML pages can be converted. This address returned ${contentType.split(";")[0].trim() || "an unknown content type"}.`,
				415,
			);
		}

		const [markdown, title] = await Promise.all([
			requestMarkdown(ai, page.body),
			readTitle(page.body),
		]);

		return {
			finalUrl: page.finalUrl.href,
			markdown: markdown.data,
			title,
			tokens: markdown.tokens,
			truncated: page.bodyTruncated,
		};
	} catch (error) {
		if (error instanceof PublicFetchError) {
			throw new UrlToMarkdownError(error.message, error.status);
		}

		throw error;
	}
}
