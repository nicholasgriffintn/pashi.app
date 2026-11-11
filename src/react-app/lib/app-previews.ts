import { type AppPreview, type AppPreviewsResponse, appPagePath } from "../../shared/app-previews";
import type { Project } from "./projects";
import { jsonQueryOptions, QueryError } from "./query-client";

export const appPreviewsQueryOptions = jsonQueryOptions<AppPreviewsResponse>("/api/apps");

export function isAccessDenied(error: Error | null) {
	return error instanceof QueryError && (error.status === 401 || error.status === 403);
}

export function appPreviewProjects(previews: readonly AppPreview[]): Project[] {
	return previews.map((preview) => ({
		blurb: preview.description,
		id: `app-${preview.id}`,
		kind: "app",
		name: preview.name,
		stack: [preview.category],
		status: "lab",
		url: appPagePath(preview.id),
	}));
}
