import { Navigate, useParams } from "react-router-dom";

interface LegacyToolRedirectProps {
	prefix: "convert" | "generate";
}

export function LegacyToolRedirect({ prefix }: LegacyToolRedirectProps) {
	const { toolId } = useParams();

	if (!toolId) {
		return <Navigate replace to="/tools" />;
	}

	const target = prefix === "convert" ? `/tools/convert/${toolId}` : `/tools/${toolId}`;

	return <Navigate replace to={`${target}${window.location.search}`} />;
}
