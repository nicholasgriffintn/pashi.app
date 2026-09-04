import { useNavigate } from "react-router-dom";

import { lastToolPath, rememberLastToolPath } from "../lib/last-tool";

interface ToolModeTabsProps {
	mode: "convert" | "generate";
}

export function ToolModeTabs({ mode }: ToolModeTabsProps) {
	const navigate = useNavigate();

	function handleChange(nextMode: "convert" | "generate") {
		if (nextMode === mode) {
			return;
		}

		rememberLastToolPath(mode, window.location.pathname);
		void navigate(lastToolPath(nextMode));
	}

	return (
		<div className="tool-controls">
			<nav aria-label="Tool mode" className="app-mode-tabs">
				<button
					aria-pressed={mode === "generate"}
					onClick={() => handleChange("generate")}
					type="button"
				>
					Generate
				</button>
				<button
					aria-pressed={mode === "convert"}
					onClick={() => handleChange("convert")}
					type="button"
				>
					Convert
				</button>
			</nav>
		</div>
	);
}
