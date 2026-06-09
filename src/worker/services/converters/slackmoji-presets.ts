export const SLACKMOJI_PRESET_PREFIX = "default_emojis/";
const PRESET_KEY_PATTERN = /^[a-z0-9][a-z0-9._/-]{0,120}$/i;

export function isAllowedPresetKey(key: string) {
	if (!key || key.includes("..") || key.includes("//")) {
		return false;
	}

	if (!PRESET_KEY_PATTERN.test(key) || key.startsWith("/") || !key.startsWith(SLACKMOJI_PRESET_PREFIX)) {
		return false;
	}

	return true;
}
