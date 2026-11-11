import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiKeyList, CreatedApiKey } from "../../shared/api-keys";
import { fetchJson } from "./query-client";

const KEYS_QUERY_KEY = ["api-keys"];

export function useApiKeys(enabled: boolean) {
	const queryClient = useQueryClient();
	const list = useQuery({
		enabled,
		queryFn: ({ signal }) => fetchJson<ApiKeyList>("/api/keys", { signal }),
		queryKey: KEYS_QUERY_KEY,
	});
	const refresh = () => queryClient.invalidateQueries({ queryKey: KEYS_QUERY_KEY });
	const create = useMutation({
		mutationFn: (name: string) =>
			fetchJson<CreatedApiKey>("/api/keys", {
				body: JSON.stringify({ name }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			}),
		onSuccess: refresh,
	});
	const revoke = useMutation({
		mutationFn: async (id: string) => {
			const response = await fetch(`/api/keys/${encodeURIComponent(id)}`, { method: "DELETE" });

			if (!response.ok) {
				throw new Error("Could not revoke that key. Try again.");
			}
		},
		onSuccess: refresh,
	});

	return { create, list, revoke };
}
