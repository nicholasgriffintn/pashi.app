import { Link } from "react-router-dom";

import { useApiKey } from "../lib/api-key-context";
import { usePolychatSession } from "../lib/use-polychat-session";

export type KeyRequirement = "conversion" | "polychat";

interface KeyRequiredNoticeProps {
	requires: KeyRequirement;
	what: string;
}

export function KeyRequiredNotice({ requires, what }: KeyRequiredNoticeProps) {
	const { apiKey } = useApiKey();
	const session = usePolychatSession();
	const isConnected = session.status === "connected";
	const isSatisfied =
		requires === "polychat" ? isConnected : Boolean(apiKey.trim()) || (isConnected && session.pro);

	if (isSatisfied) {
		return null;
	}

	return (
		<p className="key-required" role="status">
			<span>
				{what} {requires === "polychat" ? "needs Polychat." : "needs Polychat Pro or an API key."}
			</span>
			<Link to="/sign-in">
				Sign in <span aria-hidden="true">→</span>
			</Link>
		</p>
	);
}
