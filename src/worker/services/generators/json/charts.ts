import type { GeneratorRequest } from "../request.ts";
import type { GeneratorTool, JsonResult } from "../types.ts";
import { parseChoice } from "../../../utils/generation.ts";
import { escapeXml } from "../../../utils/text.ts";
import { textResult } from "./result.ts";

const CHART_TYPES = ["bar", "word-cloud"] as const;

interface ChartItem {
	label: string;
	value: number;
}

export function createChartResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	if (generator.id !== "chart-svg") {
		return undefined;
	}

	const type = parseChoice(request.fields.type, CHART_TYPES, "bar");
	const items = parseChartItems(request.fields.data || request.input);
	const svg = type === "word-cloud" ? createWordCloudSvg(items) : createBarChartSvg(items);
	return textResult(generator, request.input, svg);
}

function parseChartItems(input: string): ChartItem[] {
	const items = input
		.split(/\r?\n|,/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [label = "", value = "1"] = line.split(/\s*[:=]\s*/);
			const parsedValue = Number(value);
			return {
				label: label.trim() || "Item",
				value: Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1,
			};
		});

	return items.length > 0 ? items.slice(0, 12) : [{ label: "Item", value: 1 }];
}

function createBarChartSvg(items: readonly ChartItem[]) {
	const width = 640;
	const rowHeight = 44;
	const labelWidth = 120;
	const chartWidth = 460;
	const height = 40 + items.length * rowHeight;
	const max = Math.max(...items.map((item) => item.value), 1);

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`,
		"\t<rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>",
		...items.flatMap((item, index) => {
			const y = 24 + index * rowHeight;
			const barWidth = Math.max(4, Math.round((item.value / max) * chartWidth));
			return [
				`\t<text x="24" y="${y + 22}" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="14">${escapeXml(item.label)}</text>`,
				`\t<rect x="${labelWidth}" y="${y}" width="${barWidth}" height="28" rx="4" fill="#17c964"/>`,
				`\t<text x="${labelWidth + barWidth + 8}" y="${y + 19}" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="12">${formatValue(item.value)}</text>`,
			];
		}),
		"</svg>",
	].join("\n");
}

function createWordCloudSvg(items: readonly ChartItem[]) {
	const width = 640;
	const height = 360;
	const max = Math.max(...items.map((item) => item.value), 1);

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`,
		"\t<rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>",
		...items.map((item, index) => {
			const size = 18 + Math.round((item.value / max) * 34);
			const x = 32 + (index % 4) * 150;
			const y = 64 + Math.floor(index / 4) * 88;
			return `\t<text x="${x}" y="${y}" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="${size}">${escapeXml(item.label)}</text>`;
		}),
		"</svg>",
	].join("\n");
}

function formatValue(value: number) {
	return Number(value.toFixed(2)).toString();
}
