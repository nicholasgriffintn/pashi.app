import type React from "react";
import { useEffect, useState } from "react";

import type { ResultStageValue, TextResultStageValue } from "../lib/result-types";
import {
	formatGeneratedAt,
	formatTextResult,
	isColourRecordArray,
	isRecordArray,
	isStringArray,
	uniqueKeys,
} from "../lib/result-format";
import { createResultSummary, type ResultSummary } from "../lib/result-summary";
import { createFieldDisplayModel } from "../lib/result-field-display";
import { SlackmojiBatchResults } from "./SlackmojiBatchResults";

interface ImagePreviewItem {
	alt: string;
	label: string;
	src: string;
}

interface ResultStageProps {
	actions?: React.ReactNode;
	emptyMessage: string;
	generatedAtLabel: string;
	isLoading: boolean;
	onImageError: () => void;
	onImageLoad: () => void;
	result?: ResultStageValue;
}

const IMAGE_OUTPUT_FORMATS = new Set(["avif", "bmp", "gif", "ico", "jpeg", "jpg", "mjpeg", "png", "svg", "tif", "tiff", "webp"]);
const IMAGE_URL_KEYS = ["downloadUrl", "imageUrl", "image", "previewUrl", "thumbnailUrl", "url", "src"] as const;

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
	const summary = result ? createResultSummary(result, generatedAtLabel) : undefined;
	const [isExpanded, setIsExpanded] = useState(false);
	const expandedResult = result && isExpanded ? result : undefined;
	const expandedSummary = expandedResult ? createResultSummary(expandedResult, generatedAtLabel) : undefined;

	useEffect(() => {
		if (!expandedResult) {
			return undefined;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsExpanded(false);
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [expandedResult]);

	return (
		<section
			aria-busy={isLoading}
			aria-live="polite"
			className="result-stage"
			data-has-result={Boolean(result)}
		>
			<div className="result-box" data-result-kind={result?.kind}>
				{result ? (
					<button
						aria-label="Expand result"
						className="result-expand-button"
						onClick={() => setIsExpanded(true)}
						title="Expand result"
						type="button"
					>
						<span aria-hidden="true">↗</span>
					</button>
				) : null}
				{isLoading ? <div className="loading-generate" aria-hidden="true" /> : null}
				<div className="result-content" key={result?.generatedAt ?? result?.kind ?? "empty"}>
					{!result ? (
						<p className="empty-result">{emptyMessage}</p>
					) : result.kind === "slackmoji-batch" ? (
						<SlackmojiBatchResults compact items={result.items} />
					) : result.kind === "image" ? (
						<img
							alt={result.alt}
							className="image-result"
							onError={onImageError}
							onLoad={onImageLoad}
							src={result.src}
						/>
					) : (
						<ResultBody result={result} compact />
					)}
				</div>
				{summary ? (
					<div className="result-summary-strip">
						<strong>{summary.title}</strong>
						<span>{summary.stat}</span>
					</div>
				) : null}
				{generatedAt ? <p className="result-generated-at">{generatedAtLabel} {generatedAt}</p> : null}
			</div>
			<div className="result-action-slot" data-visible={Boolean(result && actions)}>
				{result ? actions : null}
			</div>
			{expandedResult ? (
				<div className="result-dialog-backdrop" role="presentation">
					<div
						aria-label="Expanded result"
						aria-modal="true"
						className="result-dialog"
						role="dialog"
					>
						<div className="result-dialog-header">
							<span>Result detail</span>
							<button
								aria-label="Close result detail"
								onClick={() => setIsExpanded(false)}
								type="button"
							>
								<span aria-hidden="true">×</span>
							</button>
						</div>
						<div className="result-dialog-main">
							{expandedSummary ? <ResultSummaryPanel summary={expandedSummary} /> : null}
							<div className="result-dialog-content">
								{expandedResult.kind === "slackmoji-batch" ? (
									<SlackmojiBatchResults items={expandedResult.items} />
								) : expandedResult.kind === "image" ? (
									<img
										alt={expandedResult.alt}
										className="image-result"
										onError={onImageError}
										onLoad={onImageLoad}
										src={expandedResult.src}
									/>
								) : (
									<ResultBody result={expandedResult} />
								)}
							</div>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}

function ResultSummaryPanel({ summary }: { summary: ResultSummary }) {
	return (
		<aside className="result-summary-panel">
			<div>
				<h2>{summary.title}</h2>
				<p>{summary.stat}</p>
			</div>
			<dl className="result-summary-metrics">
				{summary.metrics.map((metric) => (
					<div key={metric.label}>
						<dt>{metric.label}</dt>
						<dd>{metric.value}</dd>
					</div>
				))}
			</dl>
			<dl className="result-summary-details">
				{summary.details.map((detail) => (
					<div key={`${detail.label}-${detail.value}`}>
						<dt>{detail.label}</dt>
						<dd>
							{detail.href ? (
								<a href={detail.href} rel="noreferrer" target="_blank">{detail.value}</a>
							) : (
								detail.value
							)}
						</dd>
					</div>
				))}
			</dl>
			{summary.footnote ? <p className="result-summary-footnote">{summary.footnote}</p> : null}
		</aside>
	);
}

function ResultBody({ compact = false, result }: { compact?: boolean; result: TextResultStageValue }) {
	const imagePreview = createImagePreview(result);
	if (imagePreview.length > 0) {
		return <ImagePreviewResult compact={compact} items={imagePreview} />;
	}

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

	const text = formatTextResult(result.result);
	return <pre className="text-result" data-density={textResultDensity(text)}>{text}</pre>;
}

function textResultDensity(text: string) {
	const lines = text.split("\n");
	const longestLine = lines.reduce((longest, line) => Math.max(longest, line.length), 0);

	if (lines.length === 1 && text.length <= 16) {
		return "short";
	}

	if (lines.length <= 3 && text.length <= 80 && longestLine <= 36) {
		return "medium";
	}

	return "long";
}

function ImagePreviewResult({ compact, items }: { compact: boolean; items: ImagePreviewItem[] }) {
	const visibleItems = compact ? items.slice(0, 4) : items;

	return (
		<div className="image-preview-result" data-compact={compact}>
			<div className="image-preview-grid">
				{visibleItems.map((item) => (
					<a className="image-preview-item" href={item.src} key={`${item.label}-${item.src}`} rel="noreferrer" target="_blank">
						<img alt={item.alt} src={item.src} />
						<span>{item.label}</span>
					</a>
				))}
			</div>
			{compact && items.length > 4 ? <p className="image-preview-more">+{items.length - 4} more</p> : null}
		</div>
	);
}

function createImagePreview(result: TextResultStageValue): ImagePreviewItem[] {
	if (typeof result.result === "string") {
		return imageUrlFromString(result.result)
			? [{ alt: `${result.label} result`, label: result.label, src: result.result }]
			: [];
	}

	if (Array.isArray(result.result)) {
		if (isStringArray(result.result)) {
			return result.result
				.filter(imageUrlFromString)
				.map((src, index) => ({ alt: `${result.label} image ${index + 1}`, label: imageLabel(src, index), src }));
		}

		if (isRecordArray(result.result)) {
			return result.result.flatMap((record, index) => {
				const src = imageUrlFromRecord(record);
				return src ? [{ alt: `${result.label} image ${index + 1}`, label: imageLabel(record.name || record.label || src, index), src }] : [];
			});
		}

		return [];
	}

	const src = imageUrlFromRecord(result.result);
	if (!src || !isImageResultRecord(result.result)) {
		return [];
	}

	return [{
		alt: `${result.label} preview`,
		label: result.result.outputFormat ? result.result.outputFormat.toUpperCase() : result.label,
		src,
	}];
}

function imageUrlFromRecord(record: Record<string, string>) {
	for (const key of IMAGE_URL_KEYS) {
		const value = record[key];
		if (value) {
			return value;
		}
	}

	return undefined;
}

function isImageResultRecord(record: Record<string, string>) {
	return isImageOutputFormat(record.outputFormat || record.format || record.mimeType) || Boolean(imageUrlFromString(imageUrlFromRecord(record) ?? ""));
}

function isImageOutputFormat(value: string | undefined) {
	if (!value) {
		return false;
	}

	const normalized = value.toLowerCase().replace(/^image\//, "").replace(/^.*\./, "");
	return IMAGE_OUTPUT_FORMATS.has(normalized);
}

function imageUrlFromString(value: string | undefined) {
	if (!value) {
		return undefined;
	}

	try {
		const url = new URL(value, window.location.origin);
		const pathParts = url.pathname.toLowerCase().split(".");
		const extension = pathParts[pathParts.length - 1];
		return extension && IMAGE_OUTPUT_FORMATS.has(extension) ? value : undefined;
	} catch {
		return undefined;
	}
}

function imageLabel(value: string, index: number) {
	const trimmed = value.trim();
	if (!trimmed) {
		return `Image ${index + 1}`;
	}

	return trimmed.replace(/^.*\//, "") || `Image ${index + 1}`;
}
