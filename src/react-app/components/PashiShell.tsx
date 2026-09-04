import type React from "react";

import type { ResultStageValue } from "../lib/result-types";
import { KeyRequiredNotice } from "./KeyRequiredNotice";
import { PashiLogoButton, type MascotState } from "./PashiLogoButton";
import { ResultStage } from "./ResultStage";

interface PashiShellProps {
	actions?: React.ReactNode;
	children: React.ReactNode;
	controls: React.ReactNode;
	emptyResultMessage: string;
	generatedAtLabel: string;
	intro: string;
	isInfoLoading: boolean;
	isLoading: boolean;
	keyRequiredFor?: string;
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
	controls,
	emptyResultMessage,
	generatedAtLabel,
	intro,
	isInfoLoading,
	isLoading,
	keyRequiredFor,
	notification,
	onClearResultHistory,
	onImageError,
	onImageLoad,
	onRestoreResult,
	result,
	resultHistory,
	statusMessage,
}: PashiShellProps) {
	const mascotState: MascotState = notification.toLowerCase().includes("error")
		? "error"
		: result
			? "ready"
			: "empty";

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
					{controls}
					<div className="tool-surface">
						{children}
						{keyRequiredFor ? <KeyRequiredNotice what={keyRequiredFor} /> : null}
					</div>
				</div>

				<div className="showcase">
					<PashiLogoButton
						className="mascot-button"
						imageClassName="mascot"
						isLoading={isInfoLoading || isLoading}
						state={mascotState}
					/>
					<ScreenReaderStatus message={isInfoLoading ? statusMessage : ""} />
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
			<div className="pashi-toast" data-visible={notification ? "true" : undefined} role="status">
				{notification}
			</div>
		</main>
	);
}
