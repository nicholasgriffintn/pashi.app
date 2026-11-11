import type { AppPreview } from "../../shared/app-previews";
import { mcpViewName } from "./resources";
import { listMcpAppDefinitions } from "./tools";

export function listAppPreviews(): AppPreview[] {
	return listMcpAppDefinitions().flatMap(({ access, app, resourceUri }) => {
		const id = mcpViewName(resourceUri);

		return id
			? [
					{
						access,
						category: app.category,
						description: app.description,
						icon: app.icon,
						id,
						name: app.name,
						produces: app.produces,
						theme: app.theme,
						uses: app.uses,
						when: app.when,
					},
				]
			: [];
	});
}

export function findAppPreview(id: string) {
	return listAppPreviews().find((preview) => preview.id === id);
}
