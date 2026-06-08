import { useEffect, useRef, useState } from "react";

import { playPashiImpact } from "../lib/pashi-sfx";

interface PashiLogoButtonProps {
	className: string;
	imageClassName: string;
	isLoading?: boolean;
}

export function PashiLogoButton({
	className,
	imageClassName,
	isLoading = false,
}: PashiLogoButtonProps) {
	const [isImpacting, setIsImpacting] = useState(false);
	const impactTimer = useRef<number | undefined>(undefined);

	useEffect(() => {
		return () => window.clearTimeout(impactTimer.current);
	}, []);

	function handleClick() {
		window.clearTimeout(impactTimer.current);
		setIsImpacting(true);
		impactTimer.current = window.setTimeout(() => setIsImpacting(false), 220);
		void playPashiImpact();
	}

	return (
		<button
			aria-label="Play the Pashi sound effect"
			className={className}
			data-impact={isImpacting || undefined}
			data-loading={isLoading || undefined}
			onClick={handleClick}
			type="button"
		>
			<img alt="" aria-hidden="true" className={imageClassName} src="/logo.svg" />
		</button>
	);
}
