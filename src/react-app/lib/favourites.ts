const STORAGE_KEY = "pashi:favourites";
const FAVOURITE_LIMIT = 24;

export interface Favourite {
	label: string;
	mode: "convert" | "generate";
	toolId: string;
}

function readStorage(): Favourite[] {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);

		if (!raw) {
			return [];
		}

		const parsed: unknown = JSON.parse(raw);

		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.filter(
			(entry): entry is Favourite =>
				typeof entry === "object" &&
				entry !== null &&
				typeof (entry as Favourite).toolId === "string" &&
				typeof (entry as Favourite).label === "string" &&
				((entry as Favourite).mode === "convert" || (entry as Favourite).mode === "generate"),
		);
	} catch {
		return [];
	}
}

function writeStorage(favourites: Favourite[]) {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites.slice(0, FAVOURITE_LIMIT)));
	} catch {
		return;
	}
}

export function listFavourites() {
	return readStorage();
}

export function isFavourite(toolId: string) {
	return readStorage().some((entry) => entry.toolId === toolId);
}

export function toggleFavourite(favourite: Favourite) {
	const current = readStorage();
	const exists = current.some((entry) => entry.toolId === favourite.toolId);
	const next = exists
		? current.filter((entry) => entry.toolId !== favourite.toolId)
		: [favourite, ...current];

	writeStorage(next);

	return !exists;
}
