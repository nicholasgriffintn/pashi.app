import type React from "react";

import type { ResultStageValue, TextResultStageValue } from "../lib/result-types";
import {
	formatGeneratedAt,
	formatTextResult,
	isColourRecordArray,
	isRecordArray,
	isStringArray,
	uniqueKeys,
} from "../lib/result-format";
import { createFieldDisplayModel } from "../lib/result-field-display";
import { SlackmojiBatchResults } from "./SlackmojiBatchResults";

interface ResultStageProps {
	actions?: React.ReactNode;
	emptyMessage: string;
	generatedAtLabel: string;
	isLoading: boolean;
	onImageError: () => void;
	onImageLoad: () => void;
	result?: ResultStageValue;
}

export function ResultStage({
	actions,
	emptyMessage,
	generatedAtLabel,
	isLoading,
	onImageError,
	onImageLoad,
	result,
}: ResultStageProps) {
	const generatedAt = formatGeneratedAt(result?.generatedAt);

	return (
		<section
			aria-busy={isLoading}
			aria-live="polite"
			className="result-stage"
			data-has-result={Boolean(result)}
		>
			<div className="result-box" data-result-kind={result?.kind}>
				{isLoading ? <div className="loading-generate" aria-hidden="true" /> : null}
				<div className="result-content" key={result?.generatedAt ?? result?.kind ?? "empty"}>
					{!result ? (
						<p className="empty-result">{emptyMessage}</p>
					) : result.kind === "slackmoji-batch" ? (
						<SlackmojiBatchResults items={result.items} />
					) : result.kind === "image" ? (
						<img
							alt={result.alt}
							className="image-result"
							onError={onImageError}
							onLoad={onImageLoad}
							src={result.src}
						/>
					) : (
						<ResultBody result={result} />
					)}
				</div>
				{generatedAt ? <p className="result-generated-at">{generatedAtLabel} {generatedAt}</p> : null}
			</div>
			<div className="result-action-slot" data-visible={Boolean(result && actions)}>
				{result ? actions : null}
			</div>
		</section>
	);
}

function ResultBody({ result }: { result: TextResultStageValue }) {
	if (result.kind === "palette" && Array.isArray(result.result) && isStringArray(result.result)) {
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

	if (result.kind === "fields" && Array.isArray(result.result) && isRecordArray(result.result)) {
		if (isColourRecordArray(result.result)) {
			return (
				<div className="colour-records-result">
					{result.result.map((record) => (
						<article className="colour-card" key={`${record.hex}-${record.rgb}`} style={{ background: record.primary }}>
							<strong>{record.primary}</strong>
							<span>{record.palette} / {record.format}</span>
							<dl>
								<div>
									<dt>HEX</dt>
									<dd>{record.hex}</dd>
								</div>
								<div>
									<dt>RGB</dt>
									<dd>{record.rgb}</dd>
								</div>
								<div>
									<dt>Contrast</dt>
									<dd>W {record.contrastWhite} / B {record.contrastBlack}</dd>
								</div>
								<div>
									<dt>AA</dt>
									<dd>{record.wcagAaNormal}</dd>
								</div>
							</dl>
						</article>
					))}
				</div>
			);
		}

		const columns = uniqueKeys(result.result);
		return (
			<div className="records-result">
				<table>
					<thead>
						<tr>
							{columns.map((column) => (
								<th key={column}>{column}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{result.result.map((record, index) => (
							<tr key={index}>
								{columns.map((column) => (
									<td key={column}>{record[column] ?? ""}</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	if (result.kind === "fields" && !Array.isArray(result.result) && typeof result.result !== "string") {
		const fieldDisplay = createFieldDisplayModel(result.result);

		return (
			<dl className="field-result">
				{fieldDisplay.status ? (
					<div className="field-status" data-status={fieldDisplay.status.toLowerCase()}>
						<dt>Status</dt>
						<dd>{fieldDisplay.status}</dd>
					</div>
				) : null}
				{fieldDisplay.error ? (
					<div className="field-error">
						<dt>Error</dt>
						<dd>{fieldDisplay.error}</dd>
					</div>
				) : null}
				{fieldDisplay.entries.map(([key, value]) => (
					<div key={key}>
						<dt>{key}</dt>
						<dd>{value}</dd>
					</div>
				))}
			</dl>
		);
	}

	return <pre className="text-result">{formatTextResult(result.result)}</pre>;
}
