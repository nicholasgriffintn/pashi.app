export type AppAccess = "account" | "api-key-or-pro" | "polychat-pro";

export interface AppPreview {
	access: AppAccess;
	category: string;
	description: string;
	icon: string;
	id: string;
	name: string;
	produces: string;
	theme: string;
	uses: string;
	when: string;
}

export interface AppPreviewsResponse {
	apps: AppPreview[];
}

export const APP_ACCESS_LABELS: Record<AppAccess, string> = {
	account: "a Polychat link or a Pashi API key.",
	"api-key-or-pro": "a Pashi API key, or a Polychat link on the Pro plan.",
	"polychat-pro": "a Polychat link on the Pro plan.",
};

export function appPagePath(id: string) {
	return `/labs/apps/${encodeURIComponent(id)}`;
}
