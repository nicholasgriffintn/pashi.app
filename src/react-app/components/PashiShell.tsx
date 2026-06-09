import type React from "react";

import { PashiLogoButton } from "./PashiLogoButton";
import { ResultStage } from "./ResultStage";
import type { ResultStageValue } from "../lib/result-types";

interface PashiShellProps {
	actions?: React.ReactNode;
	children: React.ReactNode;
	emptyResultMessage: string;
	generatedAtLabel: string;
	intro: string;
	isInfoLoading: boolean;
	isLoading: boolean;
	modeTabs: React.ReactNode;
	notification: string;
	onImageError: () => void;
	onImageLoad: () => void;
	result?: ResultStageValue;
	statusMessage: string;
}

function ScreenReaderStatus({ message }: { message: string }) {
	return (
		<p className="sr-only" role="status">
			{message}
		</p>
	);
}

export function PashiShell({
	actions,
	children,
	emptyResultMessage,
	generatedAtLabel,
	intro,
	isInfoLoading,
	isLoading,
	modeTabs,
	notification,
	onImageError,
	onImageLoad,
	result,
	statusMessage,
}: PashiShellProps) {
	return (
		<main className="shell">
			<section className="hero" aria-labelledby="pashi-title">
				<div className="copy">
					<PashiLogoButton
						className="mobile-logo-button"
						imageClassName="mobile-logo"
						isLoading={isInfoLoading}
					/>
					<h1 id="pashi-title">Pashi</h1>
					<p className="intro">{intro}</p>
					{modeTabs}
					<div className="tool-surface">{children}</div>
				</div>

				<div className="showcase">
					<PashiLogoButton
						className="mascot-button"
						imageClassName="mascot"
						isLoading={isInfoLoading}
					/>
					{isInfoLoading ? <ScreenReaderStatus message={statusMessage} /> : null}
					<ResultStage
						actions={actions}
						emptyMessage={emptyResultMessage}
						generatedAtLabel={generatedAtLabel}
						isLoading={isLoading}
						onImageError={onImageError}
						onImageLoad={onImageLoad}
						result={result}
					/>
				</div>
			</section>
			{notification ? (
				<div className="pashi-toast" role="status">
					{notification}
				</div>
			) : null}
		</main>
	);
}
