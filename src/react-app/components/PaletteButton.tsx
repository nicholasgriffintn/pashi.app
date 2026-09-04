import { openCommandPalette } from "../lib/palette-events";

export function PaletteButton({ label = "Search" }: { label?: string }) {
	return (
		<button className="palette-button" onClick={openCommandPalette} type="button">
			<span>{label}</span>
			<kbd>K</kbd>
		</button>
	);
}
