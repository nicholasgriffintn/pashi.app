import { Link } from "react-router-dom";

import { useApiKey } from "../lib/api-key-context";
import { usePolychatSession } from "../lib/use-polychat-session";

export type KeyRequirement = "conversion" | "polychat" | "polychat-pro";

const REQUIREMENT_COPY: Record<KeyRequirement, string> = {
	conversion: "needs Polychat Pro or an API key.",
	polychat: "needs Polychat.",
	"polychat-pro": "needs Polychat Pro.",
};

interface KeyRequiredNoticeProps {
	requires: KeyRequirement;
	what: string;
}

export function KeyRequiredNotice({ requires, what }: KeyRequiredNoticeProps) {
	const { apiKey } = useApiKey();
	const session = usePolychatSession();
	const isConnected = session.status === "connected";
	const isPro = isConnected && session.pro;
	const isSatisfied =
		requires === "polychat"
			? isConnected
			: requires === "polychat-pro"
				? isPro
				: Boolean(apiKey.trim()) || isPro;

	if (isSatisfied) {
		return null;
	}

	return (
		<p className="key-required" role="status">
			<span>
				{what} {REQUIREMENT_COPY[requires]}
			</span>
			<Link to="/sign-in">
				Sign in <span aria-hidden="true">→</span>
			</Link>
		</p>
	);
}
