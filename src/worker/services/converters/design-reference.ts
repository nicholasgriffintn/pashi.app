import { fetchCachedJson } from "../../utils/cached-fetch.ts";
import {
	contrastRatio,
	parseCssColour,
	relativeLuminance,
	rgbToHex,
	type RgbColor,
} from "../../utils/color.ts";
import { asArray, asNumber, asRecord, asString, asStringArray } from "../../utils/json-guards.ts";
import {
	TAILWIND_COLOURS,
	TAILWIND_COLOURS_LICENCE,
	TAILWIND_COLOURS_SOURCE,
	TAILWIND_COLOURS_VERSION,
	TAILWIND_SHADES,
	type TailwindShade,
} from "./data/tailwind-colours.ts";

export const DESIGN_REFERENCE_FORMATS = ["icons", "fonts", "colours"] as const;

export const ICON_LICENCE_FILTERS = ["any", "permissive"] as const;

export type DesignReferenceFormat = (typeof DESIGN_REFERENCE_FORMATS)[number];

export type IconLicenceFilter = (typeof ICON_LICENCE_FILTERS)[number];

export class DesignReferenceError extends Error {
	readonly status: number;

	constructor(message: string, status = 422) {
		super(message);
		this.status = status;
	}
}

const ICONIFY_URL = "https://api.iconify.design";
const FONTSOURCE_URL = "https://api.fontsource.org/v1/fonts";
const JSDELIVR_FONTSOURCE_URL = "https://cdn.jsdelivr.net/npm/@fontsource";

const LOOKUP_TTL_SECONDS = 24 * 60 * 60;
const ICON_SEARCH_MAX_BYTES = 256 * 1024;
const FONT_LIST_MAX_BYTES = 2 * 1024 * 1024;
const FONT_RECORD_MAX_BYTES = 1024 * 1024;

const MAX_QUERY_LENGTH = 100;
const MAX_ICONS = 24;
const MAX_FONTS = 12;
const MAX_QUERY_TOKENS = 6;
const MAX_SEARCH_SCAN = 4_000;

const PERMISSIVE_SPDX_IDS = new Set([
	"0BSD",
	"Apache-2.0",
	"BSD-2-Clause",
	"BSD-3-Clause",
	"CC0-1.0",
	"ISC",
	"MIT",
	"OFL-1.1",
	"Unlicense",
]);

const ICONIFY_ATTRIBUTION = {
	licence: "Icon sets carry their own licences, listed against each result.",
	source: "https://iconify.design",
} as const;

const FONTSOURCE_ATTRIBUTION = {
	licence: "Fontsource packages carry each font's own licence, listed against each result.",
	source: "https://fontsource.org",
} as const;

const TAILWIND_ATTRIBUTION = {
	licence: TAILWIND_COLOURS_LICENCE,
	source: TAILWIND_COLOURS_SOURCE,
	version: TAILWIND_COLOURS_VERSION,
} as const;

export function isDesignReferenceFormat(value: string | undefined): value is DesignReferenceFormat {
	return DESIGN_REFERENCE_FORMATS.some((format) => format === value);
}

export function isIconLicenceFilter(value: string | undefined): value is IconLicenceFilter {
	return ICON_LICENCE_FILTERS.some((filter) => filter === value);
}

function readQuery(input: string, hint: string) {
	const query = input.trim();

	if (!query) {
		throw new DesignReferenceError(hint);
	}

	if (query.length > MAX_QUERY_LENGTH) {
		throw new DesignReferenceError(`Keep the search under ${MAX_QUERY_LENGTH} characters.`);
	}

	return query;
}

function describeIconSet(prefix: string, collections: Record<string, unknown>) {
	const collection = asRecord(collections[prefix]);
	const licence = asRecord(collection?.license);

	return {
		licence: {
			spdx: asString(licence?.spdx) ?? null,
			title: asString(licence?.title) ?? null,
			url: asString(licence?.url) ?? null,
		},
		set: asString(collection?.name) ?? prefix,
	};
}

function isPermissiveLicence(spdx: string | null) {
	return spdx !== null && PERMISSIVE_SPDX_IDS.has(spdx);
}

async function searchIcons(input: string, licenceFilter: IconLicenceFilter) {
	const query = readQuery(input, "Enter an icon name to search for, such as rocket.");
	const params = new URLSearchParams({ limit: String(MAX_ICONS), query });
	const { body, status } = await fetchCachedJson(`${ICONIFY_URL}/search?${params.toString()}`, {
		maxBytes: ICON_SEARCH_MAX_BYTES,
		source: "Iconify",
		ttlSeconds: LOOKUP_TTL_SECONDS,
	});
	const record = asRecord(body);

	if (status !== 200 || !record) {
		throw new DesignReferenceError("Iconify could not search for that term.", 502);
	}

	const collections = asRecord(record.collections) ?? {};
	const matches = asStringArray(record.icons).flatMap((id) => {
		const separator = id.indexOf(":");

		if (separator < 1) {
			return [];
		}

		const prefix = id.slice(0, separator);
		const name = id.slice(separator + 1);
		const { licence, set } = describeIconSet(prefix, collections);

		if (licenceFilter === "permissive" && !isPermissiveLicence(licence.spdx)) {
			return [];
		}

		return [
			{
				id,
				licence,
				name,
				prefix,
				set,
				svgUrl: `${ICONIFY_URL}/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`,
			},
		];
	});

	return {
		attribution: ICONIFY_ATTRIBUTION,
		licenceFilter,
		matches: matches.slice(0, MAX_ICONS),
		query,
	};
}

function describeFont(record: Record<string, unknown>, id: string) {
	return {
		category: asString(record.category) ?? null,
		cssImport: `@import "@fontsource/${id}";`,
		cssUrl: `${JSDELIVR_FONTSOURCE_URL}/${id}/index.css`,
		family: asString(record.family) ?? id,
		id,
		licence: asString(record.license) ?? null,
		styles: asStringArray(record.styles),
		subsets: asStringArray(record.subsets),
		weights: asArray(record.weights).flatMap((weight) => asNumber(weight) ?? []),
	};
}

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

async function lookupFonts(input: string) {
	const query = readQuery(input, "Enter a font family or Fontsource id, such as inter.");
	const list = await fetchCachedJson(FONTSOURCE_URL, {
		maxBytes: FONT_LIST_MAX_BYTES,
		source: "Fontsource",
		timeoutMs: 15_000,
		ttlSeconds: LOOKUP_TTL_SECONDS,
	});
	const fonts = asArray(list.body)
		.slice(0, MAX_SEARCH_SCAN)
		.flatMap((entry) => {
			const record = asRecord(entry);
			const id = asString(record?.id);

			return record && id ? [{ id, record }] : [];
		});

	if (list.status !== 200 || fonts.length === 0) {
		throw new DesignReferenceError("Fontsource could not list fonts.", 502);
	}

	const slug = slugify(query);
	const exact = fonts.find((font) => font.id === slug);

	if (exact) {
		const detail = await fetchCachedJson(`${FONTSOURCE_URL}/${encodeURIComponent(exact.id)}`, {
			maxBytes: FONT_RECORD_MAX_BYTES,
			source: "Fontsource",
			ttlSeconds: LOOKUP_TTL_SECONDS,
		});
		const full = asRecord(detail.body);

		if (!full) {
			throw new DesignReferenceError(`Fontsource has no record for "${exact.id}".`, 404);
		}

		const rest = Object.fromEntries(Object.entries(full).filter(([key]) => key !== "variants"));

		return {
			attribution: FONTSOURCE_ATTRIBUTION,
			font: { ...rest, ...describeFont(full, exact.id) },
			query,
		};
	}

	const tokens = slug.split("-").filter(Boolean).slice(0, MAX_QUERY_TOKENS);
	const matches = fonts
		.filter((font) => {
			const haystack = `${font.id} ${slugify(asString(font.record.family) ?? "")}`;

			return tokens.every((token) => haystack.includes(token));
		})
		.toSorted((left, right) => {
			const leftStarts = left.id.startsWith(slug) ? 0 : 1;
			const rightStarts = right.id.startsWith(slug) ? 0 : 1;

			return leftStarts - rightStarts || left.id.localeCompare(right.id);
		})
		.slice(0, MAX_FONTS);

	return {
		attribution: FONTSOURCE_ATTRIBUTION,
		matches: matches.map((font) => describeFont(font.record, font.id)),
		query,
	};
}

interface TailwindMatch {
	contrastOnBlack: number;
	contrastOnWhite: number;
	family: string;
	hex: string;
	name: string;
	shade: TailwindShade;
}

function tailwindRgb(family: string, shade: TailwindShade): RgbColor {
	const colour = parseCssColour(TAILWIND_COLOURS[family][shade]);

	if (!colour) {
		throw new DesignReferenceError(`Bundled colour ${family}-${shade} is invalid.`, 500);
	}

	return colour;
}

function describeShade(family: string, shade: TailwindShade): TailwindMatch {
	const hex = TAILWIND_COLOURS[family][shade];
	const luminance = relativeLuminance(tailwindRgb(family, shade));

	return {
		contrastOnBlack: Math.round(contrastRatio(luminance, 0) * 100) / 100,
		contrastOnWhite: Math.round(contrastRatio(luminance, 1) * 100) / 100,
		family,
		hex,
		name: `${family}-${shade}`,
		shade,
	};
}

function isTailwindShade(value: string): value is TailwindShade {
	return TAILWIND_SHADES.some((shade) => shade === value);
}

function distance(left: RgbColor, right: RgbColor) {
	return Math.sqrt(
		(left.red - right.red) ** 2 + (left.green - right.green) ** 2 + (left.blue - right.blue) ** 2,
	);
}

function nearestShade(target: RgbColor) {
	let best: { distance: number; family: string; shade: TailwindShade } | undefined;

	for (const family of Object.keys(TAILWIND_COLOURS)) {
		for (const shade of TAILWIND_SHADES) {
			const candidate = distance(target, tailwindRgb(family, shade));

			if (!best || candidate < best.distance) {
				best = { distance: candidate, family, shade };
			}
		}
	}

	return best;
}

function lookupColours(input: string) {
	const query = readQuery(
		input,
		"Enter a family such as sky, a shade such as sky-500 or a hex colour.",
	);
	const text = query.toLowerCase();
	const familyNames = Object.keys(TAILWIND_COLOURS);

	if (familyNames.includes(text)) {
		return {
			attribution: TAILWIND_ATTRIBUTION,
			family: text,
			query,
			shades: TAILWIND_SHADES.map((shade) => describeShade(text, shade)),
		};
	}

	const shadeMatch = /^([a-z]+)-(\d{2,3})$/.exec(text);

	if (shadeMatch && familyNames.includes(shadeMatch[1]) && isTailwindShade(shadeMatch[2])) {
		return {
			attribution: TAILWIND_ATTRIBUTION,
			query,
			shade: describeShade(shadeMatch[1], shadeMatch[2]),
		};
	}

	if (/^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/.test(text)) {
		const colour = parseCssColour(text.startsWith("#") ? text : `#${text}`);
		const nearest = colour ? nearestShade(colour) : undefined;

		if (colour && nearest) {
			return {
				attribution: TAILWIND_ATTRIBUTION,
				distance: Math.round(nearest.distance * 100) / 100,
				exact: nearest.distance === 0,
				input: rgbToHex(colour),
				nearest: describeShade(nearest.family, nearest.shade),
				query,
			};
		}
	}

	throw new DesignReferenceError(
		`"${query}" is not a Tailwind family, shade or hex colour. Families: ${familyNames.join(", ")}.`,
	);
}

export async function lookupDesignReference(
	input: string,
	format: DesignReferenceFormat,
	licenceFilter: IconLicenceFilter = "any",
) {
	if (format === "icons") {
		return searchIcons(input, licenceFilter);
	}

	if (format === "fonts") {
		return lookupFonts(input);
	}

	return lookupColours(input);
}
