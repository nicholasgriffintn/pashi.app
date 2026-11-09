interface HostContext {
	displayMode?: string;
	theme?: string;
}

interface PashiBridge {
	callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
	connect: (appInfo: { name: string; version: string }) => Promise<HostContext | null>;
	data: () => unknown;
	embedded: boolean;
	on: (method: string, listener: (params: unknown) => void) => void;
	openLink: (url: string) => Promise<unknown>;
	sendMessage: (text: string) => Promise<unknown>;
}

declare global {
	interface Window {
		PashiBridge: PashiBridge;
	}
}

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
	connect: (name: string) => window.PashiBridge.connect({ name, version: "1.0.0" }),
	embedded: () => window.PashiBridge.embedded,
	openLink: async (url: string) => {
		if (!window.PashiBridge.embedded) {
			window.open(url, "_blank", "noopener");

			return;
		}

		await window.PashiBridge.openLink(url);
	},
	sendMessage: (text: string) => window.PashiBridge.sendMessage(text),
};

export function readViewData<T>(guard: (value: unknown) => value is T): T {
	const value = window.PashiBridge.data();

	if (!guard(value)) {
		throw new Error("This view was served without its configuration.");
	}

	return value;
}
