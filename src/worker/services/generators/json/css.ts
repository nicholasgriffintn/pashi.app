import type { GeneratorRequest } from "../request.ts";
import type { GeneratorTool, JsonResult } from "../types.ts";
import { parseInteger } from "../../../utils/generation.ts";
import { textResult } from "./result.ts";

export function createCssResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	switch (generator.id) {
		case "border-radius":
			return textResult(generator, request.input, createBorderRadius(request));
		case "box-shadow":
			return textResult(generator, request.input, createBoxShadow(request));
		case "css-gradient":
			return textResult(generator, request.input, createCssGradient(request));
		case "text-shadow":
			return textResult(generator, request.input, createTextShadow(request));
		default:
			return undefined;
	}
}

function createCssGradient(request: GeneratorRequest) {
	const angle = parseInteger(request.fields.angle ?? "", 135, 0, 360);
	const from = cssColour(request.fields.from, "#17c964");
	const to = cssColour(request.fields.to, "#0ea5e9");
	return `background: linear-gradient(${angle}deg, ${from} 0%, ${to} 100%);`;
}

function createBoxShadow(request: GeneratorRequest) {
	const x = cssPixel(request.fields.x, 0, -200, 200);
	const y = cssPixel(request.fields.y, 8, -200, 200);
	const blur = cssPixel(request.fields.blur, 24, 0, 300);
	const spread = cssPixel(request.fields.spread, 0, -100, 100);
	const color = cssColour(request.fields.color, "rgba(15, 23, 42, 0.18)");
	return `box-shadow: ${x} ${y} ${blur} ${spread} ${color};`;
}

function createTextShadow(request: GeneratorRequest) {
	const x = cssPixel(request.fields.x, 0, -200, 200);
	const y = cssPixel(request.fields.y, 2, -200, 200);
	const blur = cssPixel(request.fields.blur, 10, 0, 300);
	const color = cssColour(request.fields.color, "rgba(15, 23, 42, 0.28)");
	return `text-shadow: ${x} ${y} ${blur} ${color};`;
}

function createBorderRadius(request: GeneratorRequest) {
	const radius = cssPixel(request.fields.radius ?? request.input, 8, 0, 999);
	return `border-radius: ${radius};`;
}

function cssPixel(value: string | undefined, fallback: number, min: number, max: number) {
	return `${parseInteger(value ?? "", fallback, min, max)}px`;
}

function cssColour(value: string | undefined, fallback: string) {
	const colour = (value || fallback).trim();
	return /^[#(),.%\w\s-]+$/.test(colour) ? colour : fallback;
}
