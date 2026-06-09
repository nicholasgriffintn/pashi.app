import { useEffect, useState } from "react";

import { fetchSlackmojiPresets, type SlackmojiPreset } from "./converter-api";

interface SlackmojiPresetsState {
	error: string;
	isLoading: boolean;
	presets: SlackmojiPreset[];
}

export function useSlackmojiPresets(enabled: boolean): SlackmojiPresetsState {
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [presets, setPresets] = useState<SlackmojiPreset[]>([]);

	useEffect(() => {
		if (!enabled) {
			setError("");
			setIsLoading(false);
			setPresets([]);
			return;
		}

		let ignore = false;
		setError("");
		setIsLoading(true);

		void (async () => {
			try {
				const next = await fetchSlackmojiPresets();
				if (!ignore) {
					setPresets(next);
				}
			} catch (caught) {
				if (!ignore) {
					setError(caught instanceof Error ? caught.message : "Could not load presets.");
				}
			} finally {
				if (!ignore) {
					setIsLoading(false);
				}
			}
		})();

		return () => {
			ignore = true;
		};
	}, [enabled]);

	return {
		error,
		isLoading,
		presets,
	};
}
