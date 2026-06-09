export type AppMode = "convert" | "generate";

interface AppModeTabsProps {
	disabledModes?: Partial<Record<AppMode, string>>;
	mode: AppMode;
	onChange: (mode: AppMode) => void;
}

export function AppModeTabs({ disabledModes = {}, mode, onChange }: AppModeTabsProps) {
	function handleChange(nextMode: AppMode) {
		if (disabledModes[nextMode]) {
			return;
		}

		onChange(nextMode);
	}

	return (
		<nav aria-label="Pashi mode" className="app-mode-tabs">
			<button
				aria-pressed={mode === "generate"}
				disabled={Boolean(disabledModes.generate)}
				onClick={() => handleChange("generate")}
				title={disabledModes.generate}
				type="button"
			>
				Generate
			</button>
			<button
				aria-pressed={mode === "convert"}
				disabled={Boolean(disabledModes.convert)}
				onClick={() => handleChange("convert")}
				title={disabledModes.convert}
				type="button"
			>
				Convert
			</button>
		</nav>
	);
}
