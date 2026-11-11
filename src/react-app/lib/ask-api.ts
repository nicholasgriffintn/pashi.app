import {
	isStringArray,
	isStringRecord,
	isStringRecordArray,
	recordToText,
} from "../../shared/records";
import { fetchJson } from "./query-client";

export interface AskAnswer {
	confidence: number;
	fields: Record<string, string>;
	input: string;
	path: string;
	ran: boolean;
	reason: string;
	result?: Record<string, unknown>;
	toolId: string;
	toolLabel: string;
	toolType: "converter" | "generator";
}

export type AskOutput =
	| { entries: [string, string][]; kind: "fields" }
	| { kind: "text"; text: string };

export function askPashi(request: string) {
	return fetchJson<AskAnswer>("/api/labs/ask", {
		body: JSON.stringify({ input: request }),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});
}

export function askToolUrl(answer: AskAnswer) {
	const params = new URLSearchParams();

	if (answer.input) {
		params.set("input", answer.input);
	}

	for (const [key, value] of Object.entries(answer.fields)) {
		params.set(key, value);
	}

	const query = params.toString();

	return query ? `${answer.path}?${query}` : answer.path;
}

export function readAskOutput(answer: AskAnswer): AskOutput | undefined {
	if (!answer.ran || !answer.result) {
		return undefined;
	}

	const value = answer.result.result;

	if (typeof value === "string") {
		return { kind: "text", text: value };
	}

	if (isStringArray(value)) {
		return { kind: "text", text: value.join("\n") };
	}

	if (isStringRecordArray(value)) {
		return { kind: "text", text: value.map(recordToText).join("\n\n") };
	}

	if (isStringRecord(value)) {
		return { entries: Object.entries(value), kind: "fields" };
	}

	return { kind: "text", text: JSON.stringify(value, null, 2) };
}
