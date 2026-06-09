import { escapeXml } from "../../utils/text.ts";

export type HtmlTransformFormat =
	| "escape"
	| "extract-comments"
	| "extract-links"
	| "remove-comments"
	| "strip-tags"
	| "to-markdown"
	| "unescape";

export const HTML_TRANSFORM_FORMATS: readonly HtmlTransformFormat[] = [
	"escape",
	"unescape",
	"strip-tags",
	"extract-links",
	"extract-comments",
	"remove-comments",
	"to-markdown",
];

export function isHtmlTransformFormat(value: string): value is HtmlTransformFormat {
	return HTML_TRANSFORM_FORMATS.some((format) => format === value);
}

export function transformHtml(input: string, format: HtmlTransformFormat) {
	switch (format) {
		case "escape":
			return escapeXml(input);
		case "extract-comments":
			return extractComments(input).join("\n");
		case "extract-links":
			return extractLinks(input).join("\n");
		case "remove-comments":
			return input.replace(/<!--[\s\S]*?-->/g, "");
		case "strip-tags":
			return stripTags(input);
		case "to-markdown":
			return htmlToMarkdown(input);
		case "unescape":
			return unescapeHtml(input);
	}
}

function extractComments(input: string) {
	return [...input.matchAll(/<!--([\s\S]*?)-->/g)].map((match) => (match[1] ?? "").trim());
}

function extractLinks(input: string) {
	return [...input.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gi)]
		.map((match) => unescapeHtml(match[2] ?? "").trim())
		.filter(Boolean);
}

function stripTags(input: string) {
	return unescapeHtml(input)
		.replace(/<\/(?:h[1-6]|p|div|section|article|li|ul|ol|br)>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.split(/\n+/)
		.map((line) => line.trim().replace(/\s+/g, " "))
		.filter(Boolean)
		.join("\n");
}

function htmlToMarkdown(input: string) {
	let markdown = unescapeHtml(input)
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_match, level: string, text: string) =>
			`${"#".repeat(Number(level))} ${inlineMarkdown(text)}\n\n`
		)
		.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_match, text: string) => `- ${inlineMarkdown(text)}\n`)
		.replace(/<\/?(?:ul|ol)\b[^>]*>/gi, "")
		.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_match, text: string) => `${inlineMarkdown(text)}\n\n`)
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "");

	markdown = markdown
		.split(/\n{3,}/)
		.map((block) => block.trim())
		.filter(Boolean)
		.join("\n\n");

	return markdown;
}

function inlineMarkdown(input: string) {
	return input
		.replace(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_match, _quote: string, href: string, text: string) =>
			`[${stripInlineTags(text)}](${unescapeHtml(href)})`
		)
		.replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, (_match, text: string) => `**${stripInlineTags(text)}**`)
		.replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, (_match, text: string) => `*${stripInlineTags(text)}*`)
		.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_match, text: string) => `\`${stripInlineTags(text)}\``)
		.replace(/<[^>]+>/g, "")
		.trim()
		.replace(/\s+/g, " ");
}

function stripInlineTags(input: string) {
	return input.replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
}

function unescapeHtml(input: string) {
	return input
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, "\"")
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, "&");
}
