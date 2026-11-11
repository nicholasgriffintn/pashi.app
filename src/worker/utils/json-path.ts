export const JSON_PATH_ROOT = "$";

const IDENTIFIER_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function jsonPathKey(parent: string, key: string) {
	if (IDENTIFIER_KEY.test(key)) {
		return `${parent}.${key}`;
	}

	return `${parent}['${key.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}']`;
}

export function jsonPathIndex(parent: string, index: number) {
	return `${parent}[${index}]`;
}
