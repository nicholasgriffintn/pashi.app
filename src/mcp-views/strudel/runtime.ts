import { isRecord } from "../../shared/records";
import { withTimeout } from "../shared/async";
import type { StrudelConfig } from "./config";

type StrudelValue = Record<string, unknown>;

interface PianoPattern {
	fmap(mapper: (value: unknown) => StrudelValue): PianoPattern;
	release(value: number): PianoPattern;
	s(sound: string): PianoPattern;
}

interface StrudelCore {
	evalScope: (...modules: Promise<unknown>[]) => Promise<unknown>;
	noteToMidi: (note: string) => number;
	Pattern: { prototype: { piano?: (this: PianoPattern) => PianoPattern } };
	valueToMidi: (value: unknown) => number;
}

interface StrudelWebAudio {
	aliasBank: (url: string) => Promise<unknown>;
	getAudioContext: () => AudioContext;
	initAudioOnFirstClick: () => Promise<unknown>;
	registerSynthSounds: () => Promise<unknown>;
	registerZZFXSounds: () => Promise<unknown>;
	samples: (url: string) => Promise<unknown>;
	webaudioOutput: unknown;
}

export interface StrudelEditorUpdate {
	docChanged: boolean;
	state: { doc: { toString: () => string } };
}

export interface StrudelMirrorInstance {
	clear: () => void;
	code: string;
	evaluate: (autostart?: boolean) => Promise<void>;
	setCode: (code: string) => void;
	setTheme?: (theme: string) => void;
	stop: () => Promise<void>;
}

export interface StrudelMirrorOptions {
	defaultOutput: unknown;
	drawTime: [number, number];
	getTime: () => number;
	initialCode: string;
	onChange: (update: StrudelEditorUpdate) => void;
	onEvalError: (error: unknown) => void;
	prebake: () => Promise<void>;
	root: HTMLElement;
	theme: string;
	transpiler: unknown;
}

interface StrudelCodeMirror {
	StrudelMirror: new (options: StrudelMirrorOptions) => StrudelMirrorInstance;
}

interface StrudelTranspiler {
	transpiler: unknown;
}

export interface StrudelRuntime {
	getAudioContext: () => AudioContext;
	prebake: () => Promise<void>;
	StrudelMirror: StrudelCodeMirror["StrudelMirror"];
	transpiler: unknown;
	webaudioOutput: unknown;
}

function hasExports<T>(value: unknown, names: readonly string[]): value is T {
	return isRecord(value) && names.every((name) => name in value);
}

const RUNTIME_TIMEOUT_MS = 20_000;

export class StrudelRuntimeBlockedError extends Error {
	constructor(readonly host: string) {
		super(
			`Strudel could not load its runtime from ${host}. This host is blocking ${host}, so patterns cannot play here.`,
		);
		this.name = "StrudelRuntimeBlockedError";
	}
}

async function load<T>(url: string, names: readonly string[]): Promise<T> {
	const host = new URL(url).origin;
	let module: unknown;

	try {
		module = await withTimeout(import(/* @vite-ignore */ url), RUNTIME_TIMEOUT_MS, url);
	} catch {
		throw new StrudelRuntimeBlockedError(host);
	}

	if (!hasExports<T>(module, names)) {
		throw new Error(`Strudel could not load ${url}.`);
	}

	return module;
}

let runtimePromise: Promise<StrudelRuntime> | null = null;

const THEME_VARS_ID = "strudel-theme-vars";
const THEME_SCOPE_CLASS = "strudel-theme-scope";

export function confineStrudelTheme(root: HTMLElement) {
	const style = document.getElementById(THEME_VARS_ID);

	if (style?.textContent?.includes(":root")) {
		style.textContent = style.textContent.replaceAll(":root", `.${THEME_SCOPE_CLASS}`);
	}

	root.classList.add(THEME_SCOPE_CLASS);
}

export function sanitizeStrudelCode(code: string) {
	return code
		.replace(/"([^"]*)"/g, (_, content: string) => {
			const sanitized = content.replace(/[^a-zA-Z0-9~*/!?[\]@<>(),:._^\-\s]/g, "");

			return `"${sanitized}"`;
		})
		.replace(/;+/g, "")
		.replace(/```[a-z]*|```/g, "")
		.trim();
}

function panWidth(pan: number, width: number) {
	return pan * width + (1 - width) / 2;
}

function definePiano(core: StrudelCore) {
	const maxPan = core.noteToMidi("C8");

	core.Pattern.prototype.piano = function piano(this: PianoPattern) {
		return this.fmap((value) => {
			const fields = isRecord(value) ? value : {};

			return { ...fields, clip: fields.clip ?? 1 };
		})
			.s("piano")
			.release(0.1)
			.fmap((value) => {
				const fields = isRecord(value) ? value : {};
				const midi = core.valueToMidi(value);
				const pan = panWidth(Math.min(Math.round(midi) / maxPan, 1), 0.5);
				const current = typeof fields.pan === "number" ? fields.pan : 1;

				return { ...fields, pan: current * pan };
			});
	};
}

async function loadRuntime(config: StrudelConfig): Promise<StrudelRuntime> {
	const { modules, samples } = config;
	const [core, webaudio, codemirror, transpiler] = await Promise.all([
		load<StrudelCore>(modules.core, ["evalScope", "noteToMidi", "valueToMidi", "Pattern"]),
		load<StrudelWebAudio>(modules.webaudio, [
			"aliasBank",
			"getAudioContext",
			"initAudioOnFirstClick",
			"registerSynthSounds",
			"registerZZFXSounds",
			"samples",
			"webaudioOutput",
		]),
		load<StrudelCodeMirror>(modules.codemirror, ["StrudelMirror"]),
		load<StrudelTranspiler>(modules.transpiler, ["transpiler"]),
	]);

	const prebake = async () => {
		void webaudio.initAudioOnFirstClick();

		const scope = core.evalScope(
			import(/* @vite-ignore */ modules.core),
			import(/* @vite-ignore */ modules.draw),
			import(/* @vite-ignore */ modules.mini),
			import(/* @vite-ignore */ modules.tonal),
			import(/* @vite-ignore */ modules.webaudio),
			import(/* @vite-ignore */ modules.codemirror),
			import(/* @vite-ignore */ modules.hydra),
			import(/* @vite-ignore */ modules.midi),
		);

		await Promise.all([
			scope,
			webaudio.registerSynthSounds(),
			webaudio.registerZZFXSounds(),
			...samples.banks.map((bank) => webaudio.samples(bank)),
		]);
		void webaudio.aliasBank(samples.aliases);
		definePiano(core);
	};

	return {
		getAudioContext: webaudio.getAudioContext,
		prebake,
		StrudelMirror: codemirror.StrudelMirror,
		transpiler: transpiler.transpiler,
		webaudioOutput: webaudio.webaudioOutput,
	};
}

export function loadStrudelRuntime(config: StrudelConfig) {
	runtimePromise ??= loadRuntime(config).catch((error: unknown) => {
		runtimePromise = null;
		throw error;
	});

	return runtimePromise;
}
