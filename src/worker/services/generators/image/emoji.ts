import type { GeneratorRequest } from "../request";
import { parseInteger } from "../../../utils/generation";
import { json } from "../../../utils/http";

const INDEX_EMOJIS = [
	"😀",
	"😎",
	"✨",
	"⚡",
	"🔥",
	"🚀",
	"🎲",
	"🎯",
	"🎨",
	"💡",
	"✅",
	"👾",
] as const;

export function createEmojiImageResponse(request: GeneratorRequest) {
	const emoji = request.fields.emoji?.trim() || request.input || "⚡";
	const size = parseInteger(request.fields.size ?? "", 512, 128, 1024);
	const background = normaliseColour(request.fields.background) || "0d1024";

	return createEmojiSvgResponse(emoji, { background, size });
}

export function createEmojiImageIndexResponse(origin: string) {
	const baseUrl = `${origin}/api/v1/emoji-images`;
	const emojis = INDEX_EMOJIS.map((emoji) => {
		const unicode = emojiToCodepoint(emoji);
		return {
			emoji,
			format: "SVG",
			unicode,
			url: `${baseUrl}/${encodeURIComponent(emoji)}`,
			url_unicode: `${baseUrl}/unicode/${unicode}`,
		};
	});

	return json({
		base_url: `${baseUrl}/`,
		count: emojis.length,
		emojis,
		metadata: {
			format: "SVG",
			source: "Pashi generated emoji SVGs",
		},
		success: true,
	});
}

export function createEmojiImageByEmojiResponse(emoji: string, params: URLSearchParams) {
	return createEmojiSvgResponse(emoji || "⚡", emojiImageOptions(params));
}

export function createEmojiImageByCodepointResponse(codepoint: string, params: URLSearchParams) {
	const emoji = codepointToEmoji(codepoint);
	if (!emoji) {
		return json({ message: `Emoji image not found for Unicode: ${codepoint}` }, 404);
	}

	return createEmojiSvgResponse(emoji, emojiImageOptions(params));
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

function emojiImageOptions(params: URLSearchParams) {
	return {
		background: normaliseColour(params.get("background") ?? undefined) || "0d1024",
		size: parseInteger(params.get("size") ?? "", 512, 128, 1024),
	};
}

function emojiToCodepoint(emoji: string) {
	return [...emoji].map((character) => character.codePointAt(0)?.toString(16)).filter(Boolean).join("-");
}

function codepointToEmoji(value: string) {
	const codepoints = value
		.trim()
		.toLowerCase()
		.replace(/^u\+/, "")
		.split("-")
		.map((part) => Number.parseInt(part.replace(/^u\+/, ""), 16));

	if (codepoints.length === 0 || codepoints.some((codepoint) => !Number.isFinite(codepoint))) {
		return undefined;
	}

	try {
		return String.fromCodePoint(...codepoints);
	} catch {
		return undefined;
	}
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
