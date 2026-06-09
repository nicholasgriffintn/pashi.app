import type { GeneratorTool, JsonResult } from "../types";
import type { GeneratorRequest } from "../request";
import { contrastRatio, hslToRgb, relativeLuminance, rgbToHex } from "../../../utils/color";
import {
	hashSeed,
	parseChoice,
	parseCount,
	parseInteger,
	parseNumber,
	randomChoice,
	randomIntegerBetween,
} from "../../../utils/generation";
import { LOREM_WORDS } from "../data/words";
import { fieldsResult, paletteResult, textResult } from "./result";

type ColourFormat = "all" | "hex" | "hsl" | "hsla" | "rgb" | "rgba";
type ColourPalette = "dark" | "grayscale" | "light" | "pastel" | "random" | "vibrant";
type PaletteHarmony = "analogous" | "complementary" | "monochrome" | "random" | "split" | "triadic";

const COLOUR_FORMATS = ["hex", "rgb", "hsl", "rgba", "hsla", "all"] as const;
const COLOUR_PALETTES = ["random", "pastel", "vibrant", "dark", "light", "grayscale"] as const;
const PALETTE_HARMONIES = ["analogous", "complementary", "triadic", "split", "monochrome", "random"] as const;

export function createDesignResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	const { input } = request;
	switch (generator.id) {
		case "colour":
			return fieldsResult(generator, input, createColours(request));
		case "lorem":
			return textResult(generator, input, createLoremIpsum(request));
		case "palette":
			return paletteResult(generator, input, createPalette(request));
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

function createPalette(request: GeneratorRequest) {
	const seed = request.fields.seed?.trim() || request.input.trim() || crypto.randomUUID();
	const base = hashSeed(seed);
	const count = parseCount(request.fields.count ?? "", 5, 12);
	const harmony = parseChoice(request.fields.harmony, PALETTE_HARMONIES, "analogous");
	const saturation = parseInteger(request.fields.saturation ?? "", 72, 0, 100);
	const lightness = parseInteger(request.fields.lightness ?? "", 52, 0, 100);
	const hues = paletteHues(base % 360, count, harmony);

	return hues.map((hue, index) =>
		rgbToHex(hslToRgb({
			hue,
			lightness: clampLightness(lightness + seededOffset(base, index, 7)),
			saturation: clampPercentage(saturation + seededOffset(base, index, 9)),
		})),
	);
}

function paletteHues(baseHue: number, count: number, harmony: PaletteHarmony) {
	const offsets = paletteOffsets(count, harmony);
	return offsets.map((offset) => wrapHue(baseHue + offset));
}

function paletteOffsets(count: number, harmony: PaletteHarmony) {
	switch (harmony) {
		case "analogous":
			return centredSteps(count, 18);
		case "complementary":
			return repeatPattern(count, [0, 180, 24, 204, -24, 156]);
		case "monochrome":
			return Array.from({ length: count }, () => 0);
		case "random":
			return Array.from({ length: count }, (_, index) => index * Math.round(360 / count));
		case "split":
			return repeatPattern(count, [0, 150, 210, 24, 174, 234]);
		case "triadic":
			return repeatPattern(count, [0, 120, 240, 24, 144, 264]);
	}
}

function centredSteps(count: number, step: number) {
	const midpoint = (count - 1) / 2;
	return Array.from({ length: count }, (_, index) => Math.round((index - midpoint) * step));
}

function repeatPattern(count: number, pattern: readonly number[]) {
	return Array.from({ length: count }, (_, index) => pattern[index % pattern.length] + Math.floor(index / pattern.length) * 10);
}

function wrapHue(value: number) {
	return ((value % 360) + 360) % 360;
}

function seededOffset(seed: number, index: number, range: number) {
	return ((seed + index * 37) % (range * 2 + 1)) - range;
}

function clampPercentage(value: number) {
	return Math.max(0, Math.min(100, value));
}

function clampLightness(value: number) {
	return Math.max(8, Math.min(94, value));
}

function createColours(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? request.input, 10, 100);
	const format = parseChoice(request.fields.format, COLOUR_FORMATS, "hex");
	const palette = parseChoice(request.fields.palette, COLOUR_PALETTES, "random");
	const alpha = parseNumber(request.fields.alpha ?? "", 1, 0, 1);

	return Array.from({ length: count }, () => createColourRecord(format, palette, alpha));
}

function createColourRecord(format: ColourFormat, palette: ColourPalette, alpha: number) {
	const hsl = randomHsl(palette);
	const rgb = hslToRgb(hsl);
	const hex = rgbToHex(rgb);
	const luminance = relativeLuminance(rgb);
	const contrastWhite = contrastRatio(luminance, 1);
	const contrastBlack = contrastRatio(luminance, 0);
	const rgbValue = `rgb(${rgb.red}, ${rgb.green}, ${rgb.blue})`;
	const hslValue = `hsl(${hsl.hue}, ${hsl.saturation}%, ${hsl.lightness}%)`;
	const rgbaValue = `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${formatAlpha(alpha)})`;
	const hslaValue = `hsla(${hsl.hue}, ${hsl.saturation}%, ${hsl.lightness}%, ${formatAlpha(alpha)})`;

	return {
		contrastBlack: contrastBlack.toFixed(2),
		contrastWhite: contrastWhite.toFixed(2),
		format,
		hex,
		hsl: hslValue,
		hsla: hslaValue,
		luminance: luminance.toFixed(3),
		palette,
		primary: primaryColour(format, { hex, hsl: hslValue, hsla: hslaValue, rgb: rgbValue, rgba: rgbaValue }),
		rgb: rgbValue,
		rgba: rgbaValue,
		wcagAaLarge: contrastWhite >= 3 || contrastBlack >= 3 ? "yes" : "no",
		wcagAaNormal: contrastWhite >= 4.5 || contrastBlack >= 4.5 ? "yes" : "no",
		wcagAaaNormal: contrastWhite >= 7 || contrastBlack >= 7 ? "yes" : "no",
	};
}

function randomHsl(palette: ColourPalette) {
	if (palette === "grayscale") {
		return {
			hue: 0,
			lightness: randomIntegerBetween(0, 100),
			saturation: 0,
		};
	}

	const ranges = {
		dark: { lightness: [8, 30], saturation: [35, 100] },
		light: { lightness: [70, 100], saturation: [20, 90] },
		pastel: { lightness: [70, 90], saturation: [25, 80] },
		random: { lightness: [0, 100], saturation: [0, 100] },
		vibrant: { lightness: [40, 60], saturation: [70, 100] },
	} satisfies Record<Exclude<ColourPalette, "grayscale">, { lightness: [number, number]; saturation: [number, number] }>;
	const range = ranges[palette];

	return {
		hue: randomIntegerBetween(0, 359),
		lightness: randomIntegerBetween(range.lightness[0], range.lightness[1]),
		saturation: randomIntegerBetween(range.saturation[0], range.saturation[1]),
	};
}

function primaryColour(format: ColourFormat, colours: Record<Exclude<ColourFormat, "all">, string>) {
	return format === "all" ? colours.hex : colours[format];
}

function formatAlpha(alpha: number) {
	return Number(alpha.toFixed(2)).toString();
}
