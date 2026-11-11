import { useQuery } from "@tanstack/react-query";

import type { PashiInfo } from "./pashi-info";
import { jsonQueryOptions } from "./query-client";
import { useDocumentMetadata } from "./use-document-metadata";

interface ToolSummary {
	aliases: string[];
	description: string;
	id: string;
	label: string;
	toolType: "converter" | "generator";
}

const LISTING = {
	convert: {
		description: "Convert between text, data, document and media formats.",
		title: "Converters",
		toolType: "converter",
	},
	generate: {
		description: "Generate UUIDs, tokens, colours, test data and more.",
		title: "Generators",
		toolType: "generator",
	},
} as const;

export function useToolPageMetadata(mode: keyof typeof LISTING, toolId: string | undefined) {
	const { data } = useQuery(jsonQueryOptions<PashiInfo<ToolSummary>>("/api/info"));
	const listing = LISTING[mode];
	const routeId = toolId?.trim().toLowerCase();
	const tool = routeId
		? data?.tools.find(
				(entry) =>
					entry.toolType === listing.toolType &&
					(entry.id === routeId || entry.aliases.includes(routeId)),
			)
		: undefined;

	useDocumentMetadata(
		tool?.label ?? toolId?.replaceAll("-", " ") ?? listing.title,
		tool?.description ?? listing.description,
	);
}
