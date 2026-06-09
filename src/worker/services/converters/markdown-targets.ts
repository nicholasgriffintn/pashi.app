import { escapeXml } from "../../utils/text.ts";

export type MarkdownTargetFormat = "slack" | "wordpress-html";

export const MARKDOWN_TARGET_FORMATS: readonly MarkdownTargetFormat[] = ["slack", "wordpress-html"];

export function isMarkdownTargetFormat(value: string): value is MarkdownTargetFormat {
	return MARKDOWN_TARGET_FORMATS.some((format) => format === value);
}

export function convertMarkdownTarget(input: string, format: MarkdownTargetFormat) {
	switch (format) {
		case "slack":
			return markdownToSlack(input);
		case "wordpress-html":
			return markdownToWordPressHtml(input);
	}
}

function markdownToSlack(input: string) {
	return input
		.split(/\r?\n/)
		.map((line) => {
			const heading = /^(#{1,6})\s+(.+)$/.exec(line);
			if (heading) {
				return `*${slackInline(heading[2])}*`;
			}

			const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
			if (bullet) {
				return `• ${slackInline(bullet[1])}`;
			}

			return slackInline(line);
		})
		.join("\n")
		.trim();
}

function markdownToWordPressHtml(input: string) {
	const lines = input.split(/\r?\n/);
	const html: string[] = [];
	let inList = false;

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) {
			if (inList) {
				html.push("</ul>");
				inList = false;
			}
			continue;
		}

		const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
		if (heading) {
			if (inList) {
				html.push("</ul>");
				inList = false;
			}
			const level = heading[1].length;
			html.push(`<h${level}>${htmlInline(heading[2])}</h${level}>`);
			continue;
		}

		const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
		if (bullet) {
			if (!inList) {
				html.push("<ul>");
				inList = true;
			}
			html.push(`<li>${htmlInline(bullet[1])}</li>`);
			continue;
		}

		if (inList) {
			html.push("</ul>");
			inList = false;
		}
		html.push(`<p>${htmlInline(trimmed)}</p>`);
	}

	if (inList) {
		html.push("</ul>");
	}

	return html.join("\n");
}

function slackInline(input: string) {
	return input
		.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label: string, url: string) => {
			const safeUrl = safeLinkUrl(url);
			return safeUrl ? `<${safeUrl}|${label}>` : label;
		})
		.replace(/\*\*([^*]+)\*\*/g, "*$1*")
		.replace(/__([^_]+)__/g, "*$1*");
}

function htmlInline(input: string) {
	const escaped = escapeXml(input);
	return escaped
		.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label: string, url: string) => {
			const safeUrl = safeLinkUrl(url);
			return safeUrl ? `<a href="${escapeXml(safeUrl)}">${label}</a>` : label;
		})
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/__([^_]+)__/g, "<strong>$1</strong>")
		.replace(/`([^`]+)`/g, "<code>$1</code>");
}

function safeLinkUrl(value: string) {
	const trimmed = value.trim();
	try {
		const url = new URL(trimmed);
		return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:"
			? trimmed
			: undefined;
	} catch {
		return undefined;
	}
}
