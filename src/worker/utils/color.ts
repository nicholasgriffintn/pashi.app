import { CSS_NAMED_COLOURS } from "./css-named-colours";

export interface RgbColor {
	blue: number;
	green: number;
	red: number;
}

export interface HslColor {
	hue: number;
	lightness: number;
	saturation: number;
}

export interface CssColour extends RgbColor {
	alpha: number;
}

interface CssNumber {
	unit: string;
	value: number;
}

interface ColourFunctionParts {
	alpha: number;
	channels: (CssNumber | undefined)[];
}

const CSS_COLOUR_TOKEN_PATTERN = /(?:rgb|hsl)a?\([^()]*\)|#[0-9a-z]+|[a-z0-9]+/gi;
const CSS_COLOUR_FUNCTION_PATTERN = /^(rgb|hsl)a?\(([^()]*)\)$/;
const CSS_NUMBER_PATTERN = /^([+-]?(?:\d+\.?\d*|\.\d+))(%|deg)?$/;
const HEX_COLOUR_LENGTHS = new Set([3, 4, 6, 8]);

export function hslToRgb({ hue, lightness, saturation }: HslColor): RgbColor {
	const s = saturation / 100;
	const l = lightness / 100;
	const chroma = (1 - Math.abs(2 * l - 1)) * s;
	const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = l - chroma / 2;
	const [red, green, blue] =
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

	return {
		blue: Math.round((blue + m) * 255),
		green: Math.round((green + m) * 255),
		red: Math.round((red + m) * 255),
	};
}

export function rgbToHex({ blue, green, red }: RgbColor) {
	return `#${[red, green, blue]
		.map((channel) => channel.toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase()}`;
}

export function relativeLuminance({ blue, green, red }: RgbColor) {
	const [linearRed, linearGreen, linearBlue] = [red, green, blue].map((channel) => {
		const value = channel / 255;

		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});

	return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue;
}

export function contrastRatio(firstLuminance: number, secondLuminance: number) {
	const lighter = Math.max(firstLuminance, secondLuminance);
	const darker = Math.min(firstLuminance, secondLuminance);

	return (lighter + 0.05) / (darker + 0.05);
}

export function normaliseHexColour(value: string | undefined) {
	const colour = value?.trim().replace(/^#/, "");

	return colour && /^[0-9a-fA-F]{6}$/.test(colour) ? colour : undefined;
}

export function parseCssColour(value: string): CssColour | undefined {
	const text = value.trim().toLowerCase();

	if (text.startsWith("#")) {
		return parseHexColour(text.slice(1));
	}

	const functionMatch = CSS_COLOUR_FUNCTION_PATTERN.exec(text);

	if (functionMatch) {
		const parts = colourFunctionParts(functionMatch[2]);

		if (!parts) {
			return undefined;
		}

		return functionMatch[1] === "rgb" ? rgbFunctionColour(parts) : hslFunctionColour(parts);
	}

	const named = CSS_NAMED_COLOURS.get(text);

	return named ? parseHexColour(named.slice(1)) : undefined;
}

export function findCssColours(value: string) {
	return (value.match(CSS_COLOUR_TOKEN_PATTERN) ?? []).flatMap((token) => {
		const colour = parseCssColour(token);

		return colour ? [colour] : [];
	});
}

function parseHexColour(hex: string): CssColour | undefined {
	if (!HEX_COLOUR_LENGTHS.has(hex.length) || !/^[0-9a-f]+$/i.test(hex)) {
		return undefined;
	}

	const expanded = hex.length <= 4 ? hex.replace(/./g, (digit) => `${digit}${digit}`) : hex;
	const channel = (index: number) => Number.parseInt(expanded.slice(index * 2, index * 2 + 2), 16);

	return {
		alpha: expanded.length === 8 ? channel(3) / 255 : 1,
		blue: channel(2),
		green: channel(1),
		red: channel(0),
	};
}

function colourFunctionParts(inner: string): ColourFunctionParts | undefined {
	const [channelText, alphaText, ...extra] = inner.split("/");

	if (extra.length > 0) {
		return undefined;
	}

	const isCommaSeparated = channelText.includes(",");
	const tokens = isCommaSeparated
		? channelText.split(",").map((token) => token.trim())
		: channelText.trim().split(/\s+/);
	const alpha =
		alphaText === undefined && isCommaSeparated && tokens.length === 4
			? tokens.pop()
			: alphaText?.trim();

	if (tokens.length !== 3) {
		return undefined;
	}

	const channels = tokens.map(parseCssNumber);
	const alphaValue = alpha === undefined ? 1 : alphaChannel(parseCssNumber(alpha));

	if (alphaValue === undefined) {
		return undefined;
	}

	return { alpha: alphaValue, channels };
}

function rgbFunctionColour({ alpha, channels }: ColourFunctionParts): CssColour | undefined {
	const [red, green, blue] = channels.map(rgbChannel);

	if (red === undefined || green === undefined || blue === undefined) {
		return undefined;
	}

	return { alpha, blue, green, red };
}

function hslFunctionColour({ alpha, channels }: ColourFunctionParts): CssColour | undefined {
	const [hue, saturation, lightness] = channels;

	if (!hue || hue.unit === "%" || !isPercentageLike(saturation) || !isPercentageLike(lightness)) {
		return undefined;
	}

	return {
		alpha,
		...hslToRgb({
			hue: ((hue.value % 360) + 360) % 360,
			lightness: clampNumber(lightness.value, 0, 100),
			saturation: clampNumber(saturation.value, 0, 100),
		}),
	};
}

function parseCssNumber(token: string): CssNumber | undefined {
	const match = CSS_NUMBER_PATTERN.exec(token);

	return match ? { unit: match[2] ?? "", value: Number.parseFloat(match[1]) } : undefined;
}

function isPercentageLike(number: CssNumber | undefined): number is CssNumber {
	return number !== undefined && number.unit !== "deg";
}

function rgbChannel(number: CssNumber | undefined) {
	if (!isPercentageLike(number)) {
		return undefined;
	}

	return number.unit === "%"
		? Math.round(clampNumber(number.value, 0, 100) * 2.55)
		: Math.round(clampNumber(number.value, 0, 255));
}

function alphaChannel(number: CssNumber | undefined) {
	if (!isPercentageLike(number)) {
		return undefined;
	}

	return number.unit === "%"
		? clampNumber(number.value, 0, 100) / 100
		: clampNumber(number.value, 0, 1);
}

function clampNumber(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}
