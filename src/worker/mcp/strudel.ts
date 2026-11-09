import type { AiClient } from "../ai/run";
import { runAiTextWithFallback, type WorkersAiEnv } from "../ai/workers-ai";
import { invalidRequest } from "../services/generators/errors";
import {
	buildStrudelSystemPrompt,
	STRUDEL_COMPLEXITIES,
	STRUDEL_STYLES,
	type StrudelComplexity,
	type StrudelStyle,
} from "./strudel-prompts";

export const STRUDEL_RUNTIME = {
	host: "https://esm.sh",
	modules: {
		codemirror: "https://esm.sh/@strudel/codemirror@1.3.0",
		core: "https://esm.sh/@strudel/core@1.2.6",
		draw: "https://esm.sh/@strudel/draw@1.2.6",
		hydra: "https://esm.sh/@strudel/hydra@1.2.6",
		midi: "https://esm.sh/@strudel/midi@1.3.0",
		mini: "https://esm.sh/@strudel/mini@1.2.6",
		tonal: "https://esm.sh/@strudel/tonal@1.2.6",
		transpiler: "https://esm.sh/@strudel/transpiler@1.2.6",
		webaudio: "https://esm.sh/@strudel/webaudio@1.3.0",
	},
};

export const STRUDEL_SAMPLE_HOST = "https://raw.githubusercontent.com";

export const STRUDEL_SAMPLES = {
	aliases: `${STRUDEL_SAMPLE_HOST}/todepond/samples/main/tidal-drum-machines-alias.json`,
	banks: ["tidal-drum-machines", "piano", "Dirt-Samples", "EmuSP12", "vcsl", "mridangam"].map(
		(name) => `${STRUDEL_SAMPLE_HOST}/felixroos/dough-samples/main/${name}.json`,
	),
};

export const STRUDEL_LIMITS = {
	promptLength: 1000,
	tempo: { max: 200, min: 60 },
};

const DEFAULT_COMPLEXITY: StrudelComplexity = "medium";

interface StrudelGenerateRequest {
	complexity: StrudelComplexity;
	prompt: string;
	style?: StrudelStyle;
	tempo?: number;
}

function isStyle(value: unknown): value is StrudelStyle {
	return STRUDEL_STYLES.some((style) => style === value);
}

function isComplexity(value: unknown): value is StrudelComplexity {
	return STRUDEL_COMPLEXITIES.some((complexity) => complexity === value);
}

function readGenerateRequest(argumentsValue: Record<string, unknown>): StrudelGenerateRequest {
	const prompt = typeof argumentsValue.prompt === "string" ? argumentsValue.prompt.trim() : "";
	const { style, complexity, tempo } = argumentsValue;

	if (!prompt) {
		throw invalidRequest("Describe what you want to hear first.");
	}

	if (prompt.length > STRUDEL_LIMITS.promptLength) {
		throw invalidRequest(`Keep the description under ${STRUDEL_LIMITS.promptLength} characters.`);
	}

	if (style !== undefined && style !== "" && !isStyle(style)) {
		throw invalidRequest(`Choose a style from ${STRUDEL_STYLES.join(", ")}.`);
	}

	if (complexity !== undefined && !isComplexity(complexity)) {
		throw invalidRequest(`Choose a complexity from ${STRUDEL_COMPLEXITIES.join(", ")}.`);
	}

	if (
		tempo !== undefined &&
		(typeof tempo !== "number" ||
			!Number.isInteger(tempo) ||
			tempo < STRUDEL_LIMITS.tempo.min ||
			tempo > STRUDEL_LIMITS.tempo.max)
	) {
		throw invalidRequest(
			`Set a tempo between ${STRUDEL_LIMITS.tempo.min} and ${STRUDEL_LIMITS.tempo.max} BPM.`,
		);
	}

	return {
		complexity: isComplexity(complexity) ? complexity : DEFAULT_COMPLEXITY,
		prompt,
		style: isStyle(style) ? style : undefined,
		tempo: typeof tempo === "number" ? tempo : undefined,
	};
}

function stripCodeFences(text: string) {
	return text
		.replace(/^```(?:javascript|js|strudel)?\n?/gm, "")
		.replace(/\n?```$/gm, "")
		.trim();
}

export function setUpStrudel() {
	return { app: "strudel" };
}

export async function generateStrudelPattern(
	argumentsValue: Record<string, unknown>,
	env: WorkersAiEnv,
	ai: AiClient | undefined,
) {
	const request = readGenerateRequest(argumentsValue);
	const userPrompt = [
		`Generate Strudel code for: ${request.prompt}`,
		request.tempo ? `Tempo: ${request.tempo} BPM (use .fast() or .slow() to adjust)` : "",
	]
		.filter(Boolean)
		.join("\n");
	const text = await runAiTextWithFallback(ai, env, "strudel", [
		{ content: buildStrudelSystemPrompt(request.style, request.complexity), role: "system" },
		{ content: userPrompt, role: "user" },
	]);
	const code = stripCodeFences(text);

	if (!code) {
		throw new Error("The model did not return a pattern. Try describing it differently.");
	}

	return {
		code,
		explanation: `Generated a ${request.style ?? "musical"} pattern${request.tempo ? ` at ${request.tempo} BPM` : ""}`,
	};
}
