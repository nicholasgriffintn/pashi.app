import { isRecord, isStringArray } from "../../shared/records";

export interface StrudelModules {
	codemirror: string;
	core: string;
	draw: string;
	hydra: string;
	midi: string;
	mini: string;
	tonal: string;
	transpiler: string;
	webaudio: string;
}

export interface StrudelConfig {
	complexities: string[];
	limits: {
		codeLength: number;
		descriptionLength: number;
		nameLength: number;
		promptLength: number;
		tempo: { max: number; min: number };
	};
	modules: StrudelModules;
	samples: { aliases: string; banks: string[] };
	siteUrl: string;
	styles: string[];
}

const MODULE_NAMES = [
	"codemirror",
	"core",
	"draw",
	"hydra",
	"midi",
	"mini",
	"tonal",
	"transpiler",
	"webaudio",
] as const;

export function isStrudelConfig(value: unknown): value is StrudelConfig {
	return (
		isRecord(value) &&
		isStringArray(value.complexities) &&
		isStringArray(value.styles) &&
		typeof value.siteUrl === "string" &&
		isRecord(value.limits) &&
		isRecord(value.modules) &&
		MODULE_NAMES.every(
			(name) => isRecord(value.modules) && typeof value.modules[name] === "string",
		) &&
		isRecord(value.samples) &&
		typeof value.samples.aliases === "string" &&
		isStringArray(value.samples.banks)
	);
}

export interface StrudelPattern {
	code: string;
	createdAt: string;
	description?: string;
	id: string;
	name: string;
	tags: string[];
	updatedAt: string;
}

export function isStrudelPattern(value: unknown): value is StrudelPattern {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		typeof value.code === "string" &&
		typeof value.updatedAt === "string" &&
		isStringArray(value.tags)
	);
}

export function isPatternList(value: unknown): value is { patterns: StrudelPattern[] } {
	return isRecord(value) && Array.isArray(value.patterns) && value.patterns.every(isStrudelPattern);
}

export function isSavedPattern(value: unknown): value is { pattern: StrudelPattern } {
	return isRecord(value) && isStrudelPattern(value.pattern);
}

export function isGeneratedPattern(
	value: unknown,
): value is { code: string; explanation?: string } {
	return isRecord(value) && typeof value.code === "string";
}
