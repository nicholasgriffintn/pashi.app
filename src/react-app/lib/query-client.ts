import { QueryClient, queryOptions } from "@tanstack/react-query";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 5 * 60_000,
			refetchOnWindowFocus: false,
			retry: false,
			staleTime: 30_000,
		},
	},
});

export class QueryError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "QueryError";
		this.status = status;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, init);

	if (!response.ok) {
		const payload: unknown = await response.json().catch(() => null);
		const message =
			isRecord(payload) && typeof payload.error === "string"
				? payload.error
				: `Request failed (${response.status})`;

		throw new QueryError(message, response.status);
	}

	return response.json() as Promise<T>;
}

export function jsonQueryOptions<T>(path: string, identity = "") {
	return queryOptions({
		queryFn: ({ signal }) => fetchJson<T>(path, { signal }),
		queryKey: ["resource", path, identity],
	});
}
