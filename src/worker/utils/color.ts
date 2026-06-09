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
	return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
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
