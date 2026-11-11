export type DisplayMode = "fullscreen" | "inline";

export interface AppCapabilities {
	availableDisplayModes?: DisplayMode[];
}

export interface DisplayState {
	availableModes: readonly string[];
	mode: string;
}

interface HostContext {
	availableDisplayModes?: string[];
	displayMode?: string;
	theme?: string;
}

interface PashiBridge {
	callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
	connect: (
		appInfo: { name: string; version: string },
		appCapabilities?: AppCapabilities,
	) => Promise<HostContext | null>;
	data: () => unknown;
	display: () => DisplayState;
	embedded: boolean;
	on: (method: string, listener: (params: unknown) => void) => void;
	onDisplayChange: (listener: () => void) => () => void;
	openLink: (url: string) => Promise<unknown>;
	requestDisplayMode: (mode: DisplayMode) => Promise<string>;
	sendMessage: (text: string) => Promise<unknown>;
	updateModelContext: (text: string) => void;
}

declare global {
	interface Window {
		PashiBridge: PashiBridge;
	}
}

export const FULLSCREEN_CAPABILITIES: AppCapabilities = {
	availableDisplayModes: ["inline", "fullscreen"],
};

export const host = {
	callTool: async <T>(
		name: string,
		args: Record<string, unknown>,
		guard: (value: unknown) => value is T,
	): Promise<T> => {
		const value = await window.PashiBridge.callTool(name, args);

		if (!guard(value)) {
			throw new Error(`${name} answered in an unexpected shape.`);
		}

		return value;
	},
	connect: (name: string, appCapabilities?: AppCapabilities) =>
		window.PashiBridge.connect({ name, version: "1.0.0" }, appCapabilities),
	display: () => window.PashiBridge.display(),
	embedded: () => window.PashiBridge.embedded,
	onDisplayChange: (listener: () => void) => window.PashiBridge.onDisplayChange(listener),
	openLink: async (url: string) => {
		if (!window.PashiBridge.embedded) {
			window.open(url, "_blank", "noopener");

			return;
		}

		await window.PashiBridge.openLink(url);
	},
	requestDisplayMode: (mode: DisplayMode) => window.PashiBridge.requestDisplayMode(mode),
	sendMessage: (text: string) => window.PashiBridge.sendMessage(text),
	updateModelContext: (text: string) => window.PashiBridge.updateModelContext(text),
};

export function readViewData<T>(guard: (value: unknown) => value is T): T {
	const value = window.PashiBridge.data();

	if (!guard(value)) {
		throw new Error("This view was served without its configuration.");
	}

	return value;
}
