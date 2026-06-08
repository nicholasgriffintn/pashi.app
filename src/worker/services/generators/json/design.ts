import type { GeneratorTool, JsonResult } from "../types";
import type { GeneratorRequest } from "../request";
import { hashSeed, parseInteger, randomChoice } from "../../../utils/generation";
import { paletteResult, textResult } from "./result";

const LOREM_WORDS = [
	"lorem",
	"ipsum",
	"dolor",
	"sit",
	"amet",
	"consectetur",
	"adipiscing",
	"elit",
	"integer",
	"viverra",
	"nunc",
	"porta",
	"mauris",
	"facilisis",
	"pulvinar",
	"praesent",
	"rhoncus",
	"tellus",
	"magna",
	"aliquam",
] as const;

export function createDesignResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	const { input } = request;
	switch (generator.id) {
		case "lorem":
			return textResult(generator, input, createLoremIpsum(request));
		case "palette":
			return paletteResult(generator, input, createPalette(input || "Pashi"));
		default:
			return undefined;
	}
}

function createLoremIpsum(request: GeneratorRequest) {
	const topic = request.fields.topic?.trim() || request.input.trim();
	const paragraphs = parseInteger(request.fields.paragraphs ?? "", 2, 1, 8);
	const sentences = parseInteger(request.fields.sentences ?? "", 3, 1, 8);

	return Array.from({ length: paragraphs }, () =>
		Array.from({ length: sentences }, () => createLoremSentence(topic)).join(" "),
	).join("\n\n");
}

function createLoremSentence(topic: string) {
	const wordCount = 8 + Math.floor(hashSeed(`${topic}-${crypto.randomUUID()}`) % 9);
	const words: string[] = Array.from({ length: wordCount }, () => randomChoice(LOREM_WORDS));
	if (topic) {
		words.splice(2, 0, ...topic.toLowerCase().split(/\s+/).slice(0, 2));
	}

	const sentence = words.join(" ");
	return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

function createPalette(seed: string) {
	const base = hashSeed(seed);
	return Array.from({ length: 5 }, (_, index) => {
		const hue = (base + index * 43) % 360;
		const saturation = 62 + ((base + index * 11) % 18);
		const lightness = 44 + ((base + index * 7) % 16);
		return hslToHex(hue, saturation, lightness);
	});
}

function hslToHex(hue: number, saturation: number, lightness: number) {
	const s = saturation / 100;
	const l = lightness / 100;
	const chroma = (1 - Math.abs(2 * l - 1)) * s;
	const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = l - chroma / 2;
	const [r, g, b] =
		hue < 60
			? [chroma, x, 0]
			: hue < 120
				? [x, chroma, 0]
				: hue < 180
					? [0, chroma, x]
					: hue < 240
						? [0, x, chroma]
						: hue < 300
							? [x, 0, chroma]
							: [chroma, 0, x];
	return [r, g, b]
		.map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase()
		.replace(/^/, "#");
}
