import { useFullscreen } from "../shared/useFullscreen";
import { Button } from "./Button";

export function FullscreenControl() {
	const fullscreen = useFullscreen();

	if (!fullscreen.available) {
		return null;
	}

	const label = fullscreen.active ? "Exit full screen" : "Full screen";

	return (
		<Button
			variant="ghost"
			size="icon"
			icon={fullscreen.active ? "minimise" : "maximise"}
			aria-label={label}
			title={label}
			onClick={fullscreen.toggle}
		/>
	);
}
