export function pushAppPath(path: string) {
	if (window.location.pathname !== path || window.location.search || window.location.hash) {
		window.history.pushState(null, "", path);
	}
}

export function replaceAppPath(path: string) {
	if (window.location.pathname !== path || window.location.search || window.location.hash) {
		window.history.replaceState(null, "", path);
	}
}

export function replaceAppSearch(search: string) {
	const next = `${window.location.pathname}${search ? `?${search}` : ""}`;

	if (`${window.location.pathname}${window.location.search}` !== next) {
		window.history.replaceState(window.history.state, "", next);
	}
}
