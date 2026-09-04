import { useTheme } from "../lib/use-theme";

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();

	return (
		<button
			aria-label={theme === "dark" ? "Switch to the light theme" : "Switch to the dark theme"}
			className="theme-toggle"
			onClick={toggleTheme}
			title={theme === "dark" ? "Light theme" : "Dark theme"}
			type="button"
		>
			<span aria-hidden="true">{theme === "dark" ? "◐" : "◑"}</span>
		</button>
	);
}
