import { Link, useNavigate } from "react-router-dom";

import { lastToolPath, rememberLastToolPath } from "../lib/last-tool";
import { PaletteButton } from "./PaletteButton";
import { ThemeToggle } from "./ThemeToggle";

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
			<Link className="tool-home-link" to="/">
				Pashi
			</Link>
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
			<PaletteButton />
			<ThemeToggle />
		</div>
	);
}
