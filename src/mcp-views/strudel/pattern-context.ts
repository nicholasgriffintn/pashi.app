import { host } from "../shared/host";
import { truncateEnd } from "../shared/text";

const CONTEXT_TITLE_LENGTH = 80;
const CONTEXT_CODE_LENGTH = 1600;
const CODE_TRUNCATED = "\n… [code truncated]";

export type PatternEvent =
	| "generated from a prompt"
	| "loaded from an example"
	| "opened from the library"
	| "played"
	| "saved to the library";

export interface PatternContext {
	code: string;
	event: PatternEvent;
	title: string;
}

export function describePattern({ code, event, title }: PatternContext) {
	const name = title.trim();

	return [
		"Pashi Strudel state:",
		`Pattern title: ${name ? `“${truncateEnd(name, CONTEXT_TITLE_LENGTH)}”` : "untitled"}`,
		`Last change: ${event}`,
		"Pattern code:",
		code.trim() ? truncateEnd(code.trim(), CONTEXT_CODE_LENGTH, CODE_TRUNCATED) : "(empty)",
	].join("\n");
}

export function sharePattern(pattern: PatternContext) {
	host.updateModelContext(describePattern(pattern));
}

export function shareLibrary() {
	host.updateModelContext(
		["Pashi Strudel state:", "No pattern is open. The pattern library is showing."].join("\n"),
	);
}
