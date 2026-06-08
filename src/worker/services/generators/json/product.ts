import type { GeneratorTool, JsonResult } from "../types";
import type { GeneratorRequest } from "../request";
import { slugify } from "../../../utils/generation";
import { fieldsResult, textResult } from "./result";

export function createProductResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	const { input } = request;
	switch (generator.id) {
		case "acceptance":
			return fieldsResult(generator, input, createAcceptanceCriteria(request));
		case "release":
			return fieldsResult(generator, input, createReleaseNote(request));
		case "user-story":
			return fieldsResult(generator, input, createUserStory(request));
		case "utm":
			return textResult(generator, input, createUtmLink(request));
		default:
			return undefined;
	}
}

function createUserStory(request: GeneratorRequest) {
	const feature = primaryValueFor(request, "feature", "this workflow");
	const persona = fieldValueFor(request, "persona", "user");
	const outcome = fieldValueFor(request, "outcome", "finish the job with less manual work");
	const context = fieldValueFor(request, "context", "the current workflow");
	return {
		context,
		acceptanceHint: `Success means the ${persona.toLowerCase()} can complete ${feature.toLowerCase()} in ${context.toLowerCase()} and reach ${outcome.toLowerCase()}.`,
		benefit: `So that I can ${outcome.toLowerCase()}.`,
		need: `I want ${feature.toLowerCase()}.`,
		story: `As a ${persona.toLowerCase()}, I want ${feature.toLowerCase()} so that I can ${outcome.toLowerCase()}.`,
	};
}

function createReleaseNote(request: GeneratorRequest) {
	const change = primaryValueFor(request, "change", "the generator flow");
	const audience = fieldValueFor(request, "audience", "teams");
	const impact = fieldValueFor(request, "impact", "create and share the asset faster");
	const tone = fieldValueFor(request, "tone", "direct");
	return {
		body: `${change} is now available for ${audience.toLowerCase()}. This keeps the work moving without adding extra steps.`,
		detail: `${change} is now available for ${audience.toLowerCase()} in a ${tone.toLowerCase()} release note style.`,
		impact: `${audience} can ${impact.toLowerCase()}.`,
		title: `Improved ${change}`,
		type: "Improvement",
	};
}

function createAcceptanceCriteria(request: GeneratorRequest) {
	const feature = primaryValueFor(request, "feature", "the generator");
	const success = fieldValueFor(request, "success", "a result appears");
	const failure = fieldValueFor(request, "failure", "show a clear error without clearing the form");
	const edge = fieldValueFor(request, "edge", "unexpected input");
	return {
		edge: `Given ${edge.toLowerCase()}, when the user tries ${feature.toLowerCase()}, then the interface keeps state and explains what changed.`,
		error: `When the input is invalid, ${failure}.`,
		generation: `Given valid input for ${feature.toLowerCase()}, when I generate it, then ${success}.`,
		loading: "While generation is running, reserve the final result area to avoid layout shift.",
		ready: "The result can be copied, scanned, or inspected without extra navigation.",
	};
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
