import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { jsonQueryOptions } from "../lib/query-client";
import { searchTools, type SearchableTool } from "../lib/tool-search";
import { useStaticPageMetadata } from "../lib/use-document-metadata";

interface ApiField {
	id: string;
	label: string;
	options?: string[];
	placeholder?: string;
	required?: boolean;
}

interface ApiTool extends SearchableTool {
	endpoint?: string;
	input: { label: string; required: boolean };
	api?: { fields?: ApiField[] };
	toolType: "converter" | "generator";
}

interface ApiInfo {
	exportFormats: string[];
	tools: ApiTool[];
}

export function ApiDocsPage() {
	const [query, setQuery] = useState("");

	useStaticPageMetadata("/api");
	const { data, error, isPending } = useQuery(jsonQueryOptions<ApiInfo>("/api/info"));

	const matches = useMemo(() => {
		if (!data) {
			return [];
		}

		return searchTools(data.tools, query);
	}, [data, query]);

	return (
		<main className="page">
			<h1>API</h1>
			<p className="page-lede">
				Every tool is a URL. Send a GET with query parameters or a POST with a JSON body, and get
				JSON back. No key is needed for the text tools.
			</p>

			<pre className="page-code">
				<code>curl &quot;https://pashi.app/api/uuid?count=3&amp;format=v7&quot;</code>
			</pre>

			<p>
				Media and document conversion needs an API key in <code>X-API-Key</code> or a connected
				Polychat Pro account, because those run in a container. Exports are available at{" "}
				<code>/export/&#123;tool&#125;/&#123;format&#125;</code>
				{data ? ` in ${data.exportFormats.join(", ")}.` : "."}
			</p>

			<label className="page-search">
				<span>Search tools</span>
				<input
					onChange={(event) => setQuery(event.target.value)}
					placeholder="uuid, colour, markdown"
					type="search"
					value={query}
				/>
			</label>

			{isPending ? <p role="status">Loading the catalogue</p> : null}
			{error ? <p role="alert">Could not load the catalogue. {error.message}</p> : null}

			<ul className="api-tool-list">
				{matches.map((tool) => (
					<li key={`${tool.toolType}-${tool.id}`}>
						<div className="api-tool-head">
							<h2>{tool.label}</h2>
							<span className="api-tool-kind">{tool.toolType}</span>
						</div>
						<p>{tool.description}</p>
						{tool.endpoint ? <code className="api-tool-endpoint">{tool.endpoint}</code> : null}
						{tool.api?.fields?.length ? (
							<dl className="api-tool-fields">
								{tool.api.fields.map((field) => (
									<div key={field.id}>
										<dt>{field.id}</dt>
										<dd>
											{field.label}
											{field.options?.length ? ` (${field.options.join(", ")})` : ""}
										</dd>
									</div>
								))}
							</dl>
						) : null}
					</li>
				))}
			</ul>

			{data && matches.length === 0 ? <p>No tools match that search.</p> : null}
		</main>
	);
}
