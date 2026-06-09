import type React from "react";

import type { GenerateResult } from "../lib/generate-api";
import type { ImageResult } from "../lib/generator-state";

export type ResultStageValue = GenerateResult | ImageResult;

interface ResultStageProps {
	actions?: React.ReactNode;
	isLoading: boolean;
	onImageLoad: () => void;
	result?: ResultStageValue;
}

export function ResultStage({ actions, isLoading, onImageLoad, result }: ResultStageProps) {
	return (
		<section className="result-stage" aria-busy={isLoading} aria-live="polite">
			<div className="result-box" data-result-kind={result?.kind}>
				{isLoading ? <div className="loading-generate" aria-hidden="true" /> : null}
				{!result ? (
					<p className="empty-result">Pick a generator, paste something, generate.</p>
				) : result.kind === "image" ? (
					<img alt={result.alt} className="image-result" onLoad={onImageLoad} src={result.src} />
				) : (
					<ResultBody result={result} />
				)}
			</div>
			{result ? actions : null}
		</section>
	);
}

function ResultBody({ result }: { result: GenerateResult }) {
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

	return <pre className="text-result">{formatTextResult(result.result)}</pre>;
}

function formatTextResult(value: GenerateResult["result"]) {
	if (Array.isArray(value)) {
		if (isStringArray(value)) {
			return value.join("\n");
		}

		return value.map((record) => Object.values(record).join("\t")).join("\n");
	}

	if (typeof value === "string") {
		return value;
	}

	return Object.values(value).join("\n");
}

function isRecordArray(value: unknown[]): value is Record<string, string>[] {
	return value.every((item) => typeof item === "object" && item !== null && !Array.isArray(item));
}

function isStringArray(value: unknown[]): value is string[] {
	return value.every((item) => typeof item === "string");
}

function isColourRecordArray(records: Record<string, string>[]) {
	return records.every((record) => record.primary && record.hex && record.rgb);
}

function uniqueKeys(records: Record<string, string>[]) {
	return [...new Set(records.flatMap((record) => Object.keys(record)))];
}
