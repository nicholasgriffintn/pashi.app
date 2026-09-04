import { Link } from "react-router-dom";

import { useApiKey } from "../lib/api-key-context";

interface KeyRequiredNoticeProps {
	what: string;
}

export function KeyRequiredNotice({ what }: KeyRequiredNoticeProps) {
	const { apiKey } = useApiKey();

	if (apiKey.trim()) {
		return null;
	}

	return (
		<p className="key-required" role="status">
			<span>{what} needs an API key.</span>
			<Link to="/sign-in">
				Sign in <span aria-hidden="true">→</span>
			</Link>
		</p>
	);
}
