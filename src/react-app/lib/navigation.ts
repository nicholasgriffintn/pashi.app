export function pushAppPath(path: string) {
	if (
		window.location.pathname !== path ||
		window.location.search ||
		window.location.hash
	) {
		window.history.pushState(null, "", path);
	}
}

export function replaceAppPath(path: string) {
	if (
		window.location.pathname !== path ||
		window.location.search ||
		window.location.hash
	) {
		window.history.replaceState(null, "", path);
	}
}
