import type React from "react";

import type { GenerateResult } from "../lib/generate-api";

interface ImageResult {
	alt: string;
	kind: "image";
	src: string;
}

export type ResultStageValue = GenerateResult | ImageResult;

interface ResultStageProps {
	actions?: React.ReactNode;
	isLoading: boolean;
	onQrLoad: () => void;
	result?: ResultStageValue;
}

export function ResultStage({ actions, isLoading, onQrLoad, result }: ResultStageProps) {
	return (
		<section className="result-stage" aria-busy={isLoading} aria-live="polite">
			<div className="result-box">
				{isLoading ? <div className="loading-generate" aria-hidden="true" /> : null}
				{!result ? (
					<p className="empty-result">Pick a generator, paste something, generate.</p>
				) : result.kind === "image" ? (
					<img alt={result.alt} className="qr-result" onLoad={onQrLoad} src={result.src} />
				) : (
					<ResultBody result={result} />
				)}
			</div>
			{result ? actions : null}
		</section>
	);
}

function ResultBody({ result }: { result: GenerateResult }) {
	if (result.kind === "palette" && Array.isArray(result.result)) {
		return (
			<div className="palette-result">
				{result.result.map((colour) => (
					<div className="swatch" key={colour} style={{ background: colour }}>
						<span>{colour}</span>
					</div>
				))}
			</div>
		);
	}

	if (result.kind === "fields" && !Array.isArray(result.result) && typeof result.result !== "string") {
		return (
			<dl className="field-result">
				{Object.entries(result.result).map(([key, value]) => (
					<div key={key}>
						<dt>{key}</dt>
						<dd>{value}</dd>
					</div>
				))}
			</dl>
		);
	}

	return <pre className="text-result">{Array.isArray(result.result) ? result.result.join("\n") : String(result.result)}</pre>;
}
