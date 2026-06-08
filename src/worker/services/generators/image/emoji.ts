import type { GeneratorRequest } from "../request";
import { parseInteger } from "../../../utils/generation";

export function createEmojiImageResponse(request: GeneratorRequest) {
	const emoji = request.fields.emoji?.trim() || request.input || "⚡";
	const size = parseInteger(request.fields.size ?? "", 512, 128, 1024);
	const background = normaliseColour(request.fields.background) || "0d1024";
	const label = escapeXml(`Emoji image for ${emoji}`);
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">
<rect width="100%" height="100%" fill="#${background}"/>
<circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.42}" fill="#fff7d7"/>
<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" font-size="${size * 0.5}">${escapeXml(emoji.slice(0, 16))}</text>
</svg>`;

	return new Response(svg, {
		headers: {
			"Cache-Control": "no-store",
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
