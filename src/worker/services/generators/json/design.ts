import type { GeneratorTool, JsonResult } from "../types";
import { hashSeed } from "../../../utils/generation";
import { fieldsResult, paletteResult } from "./result";

export function createDesignResult(
	generator: GeneratorTool,
	input: string,
): JsonResult | undefined {
	switch (generator.id) {
		case "lorem":
			return fieldsResult(generator, input, createMicrocopySet(input));
		case "palette":
			return paletteResult(generator, input, createPalette(input || "Pashi"));
		default:
			return undefined;
	}
}

function createMicrocopySet(input: string) {
	const subject = subjectOr(input, "this step");
	return {
		body: `${subject} is ready when you are. Add the details now, or come back once the signal is clearer.`,
		button: "Continue",
		empty: `No ${subject.toLowerCase()} yet.`,
		heading: `Add ${subject}`,
	};
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

function subjectOr(input: string, fallback: string) {
	return input.trim() || fallback;
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
