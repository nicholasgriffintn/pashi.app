import { useFullscreen } from "../shared/useFullscreen";

export function FullscreenButton() {
	const fullscreen = useFullscreen();

	if (!fullscreen.available) {
		return null;
	}

	return (
		<button type="button" className="button" onClick={fullscreen.toggle}>
			{fullscreen.active ? "Exit full screen" : "Full screen"}
		</button>
	);
}
