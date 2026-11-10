export const POLYCHAT_APP_META_KEY = "app.polychat/app";

export const MCP_APP_PROTOCOL_VERSION = "2025-06-18";

const APP_VIEW_HOST_PREFIX = "apps.";

export function appViewOrigin(siteOrigin: string) {
	const url = new URL(siteOrigin);

	return `${url.protocol}//${APP_VIEW_HOST_PREFIX}${url.host}`;
}

export function siteOriginOfAppView(viewUrl: string) {
	const url = new URL(viewUrl);

	return url.hostname.startsWith(APP_VIEW_HOST_PREFIX)
		? `${url.protocol}//${url.host.slice(APP_VIEW_HOST_PREFIX.length)}`
		: undefined;
}

export function appViewPath(name: string) {
	return `/view/${encodeURIComponent(name)}`;
}
