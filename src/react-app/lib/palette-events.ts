const OPEN_EVENT = "pashi:open-palette";

export function openCommandPalette() {
	window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function onOpenCommandPalette(handler: () => void) {
	window.addEventListener(OPEN_EVENT, handler);

	return () => window.removeEventListener(OPEN_EVENT, handler);
}
