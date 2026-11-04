import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PolychatSessionStatus } from "../../shared/polychat";
import { fetchJson } from "./query-client";

const SESSION_QUERY_KEY = ["polychat-session"];
const SESSION_STALE_MS = 60_000;
const DISCONNECTED: PolychatSessionStatus = { status: "disconnected" };

export function usePolychatSession() {
	const { data = DISCONNECTED } = useQuery({
		queryFn: () => fetchJson<PolychatSessionStatus>("/api/polychat/session"),
		queryKey: SESSION_QUERY_KEY,
		staleTime: SESSION_STALE_MS,
	});

	return data;
}

export function usePolychatConnection() {
	const queryClient = useQueryClient();
	const session = usePolychatSession();
	const connect = useMutation({
		mutationFn: () =>
			fetchJson<{ authorisationUrl: string }>("/api/polychat/connect", { method: "POST" }),
		onSuccess: ({ authorisationUrl }) => window.location.assign(authorisationUrl),
	});
	const disconnect = useMutation({
		mutationFn: () =>
			fetchJson<PolychatSessionStatus>("/api/polychat/session", { method: "DELETE" }),
		onSuccess: (status) => queryClient.setQueryData(SESSION_QUERY_KEY, status),
	});

	return { connect, disconnect, session };
}
