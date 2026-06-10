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
	onClearResultHistory?: () => void;
	onImageError: () => void;
	onImageLoad: () => void;
	onRestoreResult?: (result: ResultStageValue) => void;
	result?: ResultStageValue;
	resultHistory?: ResultStageValue[];
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
	onClearResultHistory,
	onImageError,
	onImageLoad,
	onRestoreResult,
	result,
	resultHistory,
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
						onClearResultHistory={onClearResultHistory}
						onImageError={onImageError}
						onImageLoad={onImageLoad}
						onRestoreResult={onRestoreResult}
						result={result}
						resultHistory={resultHistory}
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
