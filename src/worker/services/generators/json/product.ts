import type { GeneratorTool, JsonResult } from "../types";
import type { GeneratorRequest } from "../request";
import { slugify } from "../../../utils/generation";
import { textResult } from "./result";

export function createProductResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	const { input } = request;
	switch (generator.id) {
		case "utm":
			return textResult(generator, input, createUtmLink(request));
		default:
			return undefined;
	}
}

function createUtmLink(request: GeneratorRequest) {
	let url: URL;
	const input = primaryValueFor(request, "url", "https://nicholasgriffin.dev/");
	try {
		url = new URL(input);
	} catch {
		try {
			url = new URL(`https://${input}`);
		} catch {
			url = new URL("https://nicholasgriffin.dev/");
		}
	}

	url.searchParams.set("utm_source", fieldValueFor(request, "source", "pashi"));
	url.searchParams.set("utm_medium", fieldValueFor(request, "medium", "generate"));
	url.searchParams.set(
		"utm_campaign",
		slugify(fieldValueFor(request, "campaign", url.hostname.replace(/^www\./, ""))) || "campaign",
	);
	return url.toString();
}

function primaryValueFor(request: GeneratorRequest, key: string, fallback: string) {
	return request.fields[key]?.trim() || request.input || fallback;
}

function fieldValueFor(request: GeneratorRequest, key: string, fallback: string) {
	return request.fields[key]?.trim() || fallback;
}
