import { useCallback, useEffect, useState } from "react";

import type { PolisRecording } from "../../shared/polis";
import { errorMessage } from "../shared/errors";
import { polisService, type PolisTownSummary } from "./service";

function byNewest(towns: PolisTownSummary[]) {
	return [...towns].sort((first, second) => second.savedAt - first.savedAt);
}

export function useSavedTowns(enabled: boolean) {
	const [towns, setTowns] = useState<PolisTownSummary[]>([]);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		try {
			setTowns(byNewest(await polisService.listTowns()));
			setError(null);
		} catch (caught) {
			setError(errorMessage(caught, "Saved towns are unavailable"));
		}
	}, []);

	useEffect(() => {
		if (enabled) {
			void refresh();
		}
	}, [enabled, refresh]);

	const save = useCallback(async (recording: PolisRecording) => {
		const town = await polisService.saveTown(recording);

		setTowns((current) => byNewest([town, ...current.filter((entry) => entry.id !== town.id)]));

		return town;
	}, []);

	const forget = useCallback(async (id: string) => {
		await polisService.deleteTown(id);
		setTowns((current) => current.filter((entry) => entry.id !== id));
	}, []);

	return { error, forget, open: polisService.getTown, refresh, save, towns };
}
