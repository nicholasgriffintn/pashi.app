import { useEffect, useRef, useState } from "react";

import { playPashiImpact } from "../lib/pashi-sfx";

export type MascotState = "empty" | "error" | "idle" | "loading" | "ready";

interface PashiLogoButtonProps {
	className: string;
	imageClassName: string;
	isLoading?: boolean;
	state?: MascotState;
}

const STATE_LABELS: Record<MascotState, string> = {
	empty: "Pashi is waiting for input",
	error: "Pashi hit an error",
	idle: "Pashi",
	loading: "Pashi is working",
	ready: "Pashi has a result",
};

export function PashiLogoButton({
	className,
	imageClassName,
	isLoading = false,
	state = "idle",
}: PashiLogoButtonProps) {
	const [isImpacting, setIsImpacting] = useState(false);
	const impactTimer = useRef<number | undefined>(undefined);
	const mascotState: MascotState = isLoading ? "loading" : state;

	useEffect(() => {
		return () => window.clearTimeout(impactTimer.current);
	}, []);

	function handleClick() {
		window.clearTimeout(impactTimer.current);
		setIsImpacting(true);
		impactTimer.current = window.setTimeout(() => setIsImpacting(false), 220);
		playPashiImpact().catch(() => undefined);
	}

	return (
		<button
			aria-label={`${STATE_LABELS[mascotState]}. Play the Pashi sound effect.`}
			className={className}
			data-impact={isImpacting || undefined}
			data-loading={mascotState === "loading" || undefined}
			data-state={mascotState}
			onClick={handleClick}
			type="button"
		>
			<img alt="" aria-hidden="true" className={imageClassName} src="/logo-v2-stylised.svg" />
		</button>
	);
}
