import { useCallback, useSyncExternalStore } from "react";

import { host } from "./host";

export function useFullscreen() {
	const display = useSyncExternalStore(host.onDisplayChange, host.display);
	const available = host.embedded() && display.availableModes.includes("fullscreen");
	const active = display.mode === "fullscreen";
	const toggle = useCallback(() => {
		void host.requestDisplayMode(active ? "inline" : "fullscreen");
	}, [active]);

	return { active, available, toggle };
}
