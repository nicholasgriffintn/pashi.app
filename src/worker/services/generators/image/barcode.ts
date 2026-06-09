import type { GeneratorRequest } from "../request";
import { escapeXml } from "../../../utils/text";
import { parseInteger } from "../../../utils/generation";
import { json } from "../../../utils/http";

const CODE_128_PATTERNS = [
	"212222",
	"222122",
	"222221",
	"121223",
	"121322",
	"131222",
	"122213",
	"122312",
	"132212",
	"221213",
	"221312",
	"231212",
	"112232",
	"122132",
	"122231",
	"113222",
	"123122",
	"123221",
	"223211",
	"221132",
	"221231",
	"213212",
	"223112",
	"312131",
	"311222",
	"321122",
	"321221",
	"312212",
	"322112",
	"322211",
	"212123",
	"212321",
	"232121",
	"111323",
	"131123",
	"131321",
	"112313",
	"132113",
	"132311",
	"211313",
	"231113",
	"231311",
	"112133",
	"112331",
	"132131",
	"113123",
	"113321",
	"133121",
	"313121",
	"211331",
	"231131",
	"213113",
	"213311",
	"213131",
	"311123",
	"311321",
	"331121",
	"312113",
	"312311",
	"332111",
	"314111",
	"221411",
	"431111",
	"111224",
	"111422",
	"121124",
	"121421",
	"141122",
	"141221",
	"112214",
	"112412",
	"122114",
	"122411",
	"142112",
	"142211",
	"241211",
	"221114",
	"413111",
	"241112",
	"134111",
	"111242",
	"121142",
	"121241",
	"114212",
	"124112",
	"124211",
	"411212",
	"421112",
	"421211",
	"212141",
	"214121",
	"412121",
	"111143",
	"111341",
	"131141",
	"114113",
	"114311",
	"411113",
	"411311",
	"113141",
	"114131",
	"311141",
	"411131",
	"211412",
	"211214",
	"211232",
	"2331112",
] as const;

export function createBarcodeResponse(request: GeneratorRequest) {
	const value = request.fields.value?.trim() || request.input || "PASHI";
	if (!isCode128BValue(value)) {
		return json({ error: "Barcode supports ASCII characters from space to tilde." }, 400);
	}

	const height = parseInteger(request.fields.height ?? "", 160, 80, 480);
	const scale = parseInteger(request.fields.scale ?? "", 2, 1, 6);
	const showText = request.fields.text !== "hide";
	const modules = createCode128Modules(value);
	const width = modules.length * scale + 32;
	const barHeight = showText ? height - 34 : height - 18;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Barcode for ${escapeXml(value)}">
<rect width="100%" height="100%" fill="#fff7d7"/>
${modules.split("").map((bit, index) => bit === "1" ? `<rect x="${16 + index * scale}" y="12" width="${scale}" height="${barHeight}" fill="#0d1024"/>` : "").join("")}
${showText ? `<text x="${width / 2}" y="${height - 12}" text-anchor="middle" font-family="monospace" font-size="16" fill="#0d1024">${escapeXml(value)}</text>` : ""}
</svg>`;

	return new Response(svg, {
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "image/svg+xml; charset=utf-8",
			"X-Content-Type-Options": "nosniff",
		},
	});
}

function createCode128Modules(value: string) {
	const codes = [104, ...Array.from(value, (character) => character.charCodeAt(0) - 32)];
	const checksum = codes.reduce(
		(sum, code, index) => sum + (index === 0 ? code : code * index),
		0,
	) % 103;
	return [...codes, checksum, 106]
		.map((code) => CODE_128_PATTERNS[code])
		.join("")
		.split("")
		.flatMap((width, index) => Array.from({ length: Number.parseInt(width, 10) }, () => index % 2 === 0 ? "1" : "0"))
		.join("");
}

function isCode128BValue(value: string) {
	return value.length > 0 && value.length <= 80 && /^[ -~]+$/.test(value);
}
