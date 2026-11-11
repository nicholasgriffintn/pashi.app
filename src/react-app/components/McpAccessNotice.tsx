import { Link } from "react-router-dom";

import { isAccessDenied } from "../lib/app-previews";

export function McpAccessNotice({ error }: { error: Error }) {
	if (isAccessDenied(error)) {
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
