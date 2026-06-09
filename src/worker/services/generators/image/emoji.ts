import type { GeneratorRequest } from "../request";
import { parseInteger } from "../../../utils/generation";

export function createEmojiImageResponse(request: GeneratorRequest) {
	const emoji = request.fields.emoji?.trim() || request.input || "⚡";
	const size = parseInteger(request.fields.size ?? "", 512, 128, 1024);
	const background = normaliseColour(request.fields.background) || "0d1024";

	return createEmojiSvgResponse(emoji, { background, size });
}

function createEmojiSvgResponse(emoji: string, options: { background: string; size: number }) {
	const label = escapeXml(`Emoji image for ${emoji}`);
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${options.size}" height="${options.size}" viewBox="0 0 ${options.size} ${options.size}" role="img" aria-label="${label}">
<rect width="100%" height="100%" fill="#${options.background}"/>
<circle cx="${options.size / 2}" cy="${options.size / 2}" r="${options.size * 0.42}" fill="#fff7d7"/>
<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" font-size="${options.size * 0.5}">${escapeXml(emoji.slice(0, 16))}</text>
</svg>`;

	return new Response(svg, {
		headers: {
			"Cache-Control": "public, max-age=31536000, immutable",
			"Content-Type": "image/svg+xml; charset=utf-8",
			"X-Content-Type-Options": "nosniff",
		},
	});
}

function normaliseColour(value: string | undefined) {
	const colour = value?.trim().replace(/^#/, "");
	return colour && /^[0-9a-fA-F]{6}$/.test(colour) ? colour : undefined;
}

function escapeXml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;")
		.replaceAll("'", "&apos;");
}
