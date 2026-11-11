import { useQuery } from "@tanstack/react-query";

import type { UsageStats } from "../../shared/stats";
import { fetchJson } from "./query-client";

export function useUsageStats() {
	return useQuery({
		queryFn: ({ signal }) => fetchJson<UsageStats>("/api/stats", { signal }),
		queryKey: ["usage-stats"],
		staleTime: 5 * 60_000,
	});
}
