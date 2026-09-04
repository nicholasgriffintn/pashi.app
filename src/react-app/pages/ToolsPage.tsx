import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ConverterConsole } from "../components/ConverterConsole";
import { GeneratorConsole } from "../components/GeneratorConsole";
import { ToolModeTabs } from "../components/ToolModeTabs";

interface ToolsPageProps {
	mode: "convert" | "generate";
}

export function ToolsPage({ mode }: ToolsPageProps) {
	const navigate = useNavigate();
	const { toolId } = useParams();

	const navigateToGenerator = useCallback(
		(nextToolId: string, options?: { replace?: boolean }) => {
			void navigate(`/tools/${nextToolId}`, { replace: options?.replace });
		},
		[navigate],
	);

	const navigateToConverter = useCallback(
		(nextToolId: string, options?: { replace?: boolean }) => {
			void navigate(`/tools/convert/${nextToolId}`, { replace: options?.replace });
		},
		[navigate],
	);

	const controls = <ToolModeTabs mode={mode} />;

	if (mode === "convert") {
		return (
			<ConverterConsole
				controls={controls}
				navigateToTool={navigateToConverter}
				routeToolId={toolId}
			/>
		);
	}

	return (
		<GeneratorConsole
			controls={controls}
			navigateToTool={navigateToGenerator}
			routeToolId={toolId}
		/>
	);
}
