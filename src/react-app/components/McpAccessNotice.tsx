import { Link } from "react-router-dom";

import { QueryError } from "../lib/query-client";

export function McpAccessNotice({ error }: { error: Error }) {
	if (error instanceof QueryError && (error.status === 401 || error.status === 403)) {
		return (
			<p className="key-required" role="status">
				<span>Apps need Polychat or an API key.</span>
				<Link to="/sign-in">
					Sign in <span aria-hidden="true">→</span>
				</Link>
			</p>
		);
	}

	return (
		<p className="ask-error" role="alert">
			{error.message}
		</p>
	);
}
