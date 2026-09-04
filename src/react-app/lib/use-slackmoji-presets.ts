import { useEffect, useState } from "react";

import { useApiKey } from "./api-key-context";
import { fetchSlackmojiPresets } from "./converter-api";
import type { SlackmojiPreset } from "./converter-api";

interface SlackmojiPresetsState {
	error: string;
	isLoading: boolean;
	presets: SlackmojiPreset[];
}

const INITIAL_STATE: SlackmojiPresetsState = { error: "", isLoading: true, presets: [] };

export function useSlackmojiPresets(): SlackmojiPresetsState {
	const { apiKey } = useApiKey();
	const [state, setState] = useState<SlackmojiPresetsState>(INITIAL_STATE);

	useEffect(() => {
		let ignore = false;

		fetchSlackmojiPresets(apiKey)
			.then((presets) => {
				if (!ignore) {
					setState({ error: "", isLoading: false, presets });
				}
			})
			.catch((caught: unknown) => {
				if (!ignore) {
					setState({
						error: caught instanceof Error ? caught.message : "Could not load presets.",
						isLoading: false,
						presets: [],
					});
				}
			});

		return () => {
			ignore = true;
		};
	}, [apiKey]);

	return state;
}
