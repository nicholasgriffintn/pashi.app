import type { GeneratorTool, JsonResult } from "../types";
import { slugify } from "../../../utils/generation";
import { fieldsResult, textResult } from "./result";

export function createProductResult(
	generator: GeneratorTool,
	input: string,
): JsonResult | undefined {
	switch (generator.id) {
		case "acceptance":
			return fieldsResult(generator, input, createAcceptanceCriteria(input));
		case "release":
			return fieldsResult(generator, input, createReleaseNote(input));
		case "user-story":
			return fieldsResult(generator, input, createUserStory(input));
		case "utm":
			return textResult(generator, input, createUtmLink(input));
		default:
			return undefined;
	}
}

function createUserStory(input: string) {
	const feature = subjectOr(input, "this workflow");
	return {
		acceptanceHint: `Success means the user can complete ${feature.toLowerCase()} without switching context.`,
		benefit: "So that I can finish the job with less manual work.",
		need: `I want ${feature.toLowerCase()}.`,
		story: `As a user, I want ${feature.toLowerCase()} so that I can finish the job with less manual work.`,
	};
}

function createReleaseNote(input: string) {
	const change = subjectOr(input, "the generator flow");
	return {
		detail: `${change} now takes fewer steps and keeps the generated output easier to inspect.`,
		impact: "Teams can create and share the asset faster.",
		title: `Improved ${change}`,
		type: "Improvement",
	};
}

function createAcceptanceCriteria(input: string) {
	const feature = subjectOr(input, "the generator");
	return {
		error: "When the input is invalid, show a clear error without clearing the form.",
		generation: `Given valid input for ${feature.toLowerCase()}, when I generate it, then a result appears.`,
		loading: "While generation is running, reserve the final result area to avoid layout shift.",
		ready: "The result can be copied, scanned, or inspected without extra navigation.",
	};
}

function createUtmLink(input: string) {
	let url: URL;
	try {
		url = new URL(input || "https://nicholasgriffin.dev/");
	} catch {
		try {
			url = new URL(`https://${input}`);
		} catch {
			url = new URL("https://nicholasgriffin.dev/");
		}
	}

	url.searchParams.set("utm_source", "pashi");
	url.searchParams.set("utm_medium", "generate");
	url.searchParams.set("utm_campaign", slugify(url.hostname.replace(/^www\./, "")) || "campaign");
	return url.toString();
}

function subjectOr(input: string, fallback: string) {
	return input.trim() || fallback;
}
