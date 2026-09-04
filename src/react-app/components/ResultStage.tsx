import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { isAuthenticatedApiUrl } from "../lib/api-request";
import { isCoinFlipStageResult } from "../lib/coin-result";
import { isDiceStageResult } from "../lib/dice-result";
import {
	createImagePreview,
	createRecordPreview,
	resultTone,
	textResultDensity,
	type ImagePreviewItem,
	type RecordPreviewItem,
} from "../lib/result-display";
import { createFieldDisplayModel } from "../lib/result-field-display";
import {
	formatGeneratedAt,
	formatGeneratedAtTime,
	formatTextResult,
	isColourRecordArray,
	isRecordArray,
	isStringArray,
	uniqueKeys,
} from "../lib/result-format";
import { resultHistoryForResult } from "../lib/result-history";
import { createResultSummary, type ResultSummary } from "../lib/result-summary";
import type { ResultStageValue, TextResultStageValue } from "../lib/result-types";
import { useFocusTrap } from "../lib/use-focus-trap";
import { CoinFlipResultView } from "./CoinFlipResultView";
import { DiceResultView } from "./DiceResultView";
import { ResultHistory } from "./ResultHistory";
import { SlackmojiBatchResults } from "./SlackmojiBatchResults";

interface ResultStageProps {
	actions?: React.ReactNode;
	emptyMessage: string;
	generatedAtLabel: string;
	isLoading: boolean;
	onImageError: () => void;
	onImageLoad: () => void;
	onClearResultHistory?: () => void;
	onRestoreResult?: (result: ResultStageValue) => void;
	result?: ResultStageValue;
	resultHistory?: ResultStageValue[];
}

export function ResultStage({
	actions,
	emptyMessage,
	generatedAtLabel,
	isLoading,
	onClearResultHistory,
	onImageError,
	onImageLoad,
	onRestoreResult,
	result,
	resultHistory = [],
}: ResultStageProps) {
	const generatedAt = formatGeneratedAt(result?.generatedAt);
	const generatedAtTime = formatGeneratedAtTime(result?.generatedAt);
	const summary = result ? createResultSummary(result, generatedAtLabel) : undefined;
	const [isExpanded, setIsExpanded] = useState(false);
	const dialogRef = useRef<HTMLDivElement | null>(null);
	const [historyViewKey, setHistoryViewKey] = useState<string | undefined>();
	const expandedResult = result && isExpanded ? result : undefined;
	const expandedSummary = expandedResult
		? createResultSummary(expandedResult, generatedAtLabel)
		: undefined;

	useFocusTrap(dialogRef, Boolean(expandedResult));
	const currentHistory = resultHistoryForResult(resultHistory, result);
	const resultToolKey = result && "type" in result ? result.type : undefined;
	const resultViewKey = result
		? `${resultToolKey ?? result.kind}-${result.generatedAt ?? ""}`
		: undefined;
	const canShowInlineHistory = Boolean(
		result &&
		currentHistory.length > 0 &&
		!isDiceStageResult(result) &&
		!isCoinFlipStageResult(result),
	);
	const isShowingHistory = Boolean(
		canShowInlineHistory && resultViewKey && historyViewKey === resultViewKey,
	);

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
			data-result-tone={resultTone(result)}
			data-result-tool={result && isDiceStageResult(result) ? "dice" : undefined}
		>
			<div
				className="result-box"
				data-result-kind={result?.kind}
				data-result-tone={resultTone(result)}
			>
				{result ? (
					<div className="result-stage-tools">
						{canShowInlineHistory ? (
							<button
								aria-label={isShowingHistory ? "Show current result" : "Show result history"}
								aria-pressed={isShowingHistory}
								className="result-stage-tool-button result-history-toggle-button"
								onClick={() => {
									setHistoryViewKey(isShowingHistory ? undefined : resultViewKey);
								}}
								title={isShowingHistory ? "Show current result" : "Show result history"}
								type="button"
							>
								<span aria-hidden="true">≡</span>
							</button>
						) : null}
						<button
							aria-label="Expand result"
							className="result-stage-tool-button result-expand-button"
							onClick={() => setIsExpanded(true)}
							title="Expand result"
							type="button"
						>
							<span aria-hidden="true">↗</span>
						</button>
					</div>
				) : null}
				{isLoading ? <div className="loading-generate" aria-hidden="true" /> : null}
				<div
					className="result-content"
					key={`${isShowingHistory ? "history" : "result"}-${result?.generatedAt ?? result?.kind ?? "empty"}`}
				>
					{!result ? (
						<div className="empty-result">
							<div aria-hidden="true" className="empty-result-mark">
								↯
							</div>
							<p>{emptyMessage}</p>
							<div aria-hidden="true" className="empty-result-chips">
								<span>QR</span>
								<span>JSON</span>
								<span>TXT</span>
							</div>
						</div>
					) : isShowingHistory && canShowInlineHistory ? (
						<div className="result-history-view">
							<ResultHistory
								generatedAtLabel={generatedAtLabel}
								history={currentHistory}
								onClear={onClearResultHistory}
								onRestore={(restoredResult) => {
									setHistoryViewKey(undefined);
									onRestoreResult?.(restoredResult);
								}}
							/>
						</div>
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
						<ResultBody
							generatedAtLabel={generatedAtLabel}
							history={canShowInlineHistory ? [] : currentHistory}
							onClearHistory={onClearResultHistory}
							onRestoreHistory={onRestoreResult}
							result={result}
							compact
						/>
					)}
				</div>
				{summary ? (
					<div className="result-summary-strip">
						<strong>{summary.title}</strong>
						<span>{summary.stat}</span>
					</div>
				) : null}
				{generatedAt && generatedAtTime ? (
					<p
						aria-label={`${generatedAtLabel} ${generatedAt}`}
						className="result-generated-at"
						title={`${generatedAtLabel} ${generatedAt}`}
					>
						{generatedAtLabel} {generatedAtTime}
					</p>
				) : null}
			</div>
			<div className="result-action-slot" data-visible={Boolean(result && actions)}>
				{result ? actions : null}
			</div>
			{expandedResult && typeof document !== "undefined"
				? createPortal(
						<div
							className="result-dialog-backdrop"
							onClick={(event) => {
								if (event.target === event.currentTarget) {
									setIsExpanded(false);
								}
							}}
							role="presentation"
						>
							<div
								aria-label="Expanded result"
								aria-modal="true"
								className="result-dialog"
								ref={dialogRef}
								role="dialog"
								tabIndex={-1}
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
											<ResultBody
												generatedAtLabel={generatedAtLabel}
												history={currentHistory}
												onClearHistory={onClearResultHistory}
												onRestoreHistory={onRestoreResult}
												result={expandedResult}
											/>
										)}
									</div>
								</div>
							</div>
						</div>,
						document.body,
					)
				: null}
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
							{detail.href && !isAuthenticatedApiUrl(detail.href) ? (
								<a href={detail.href} rel="noreferrer" target="_blank">
									{detail.value}
								</a>
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

function ResultBody({
	compact = false,
	generatedAtLabel,
	history = [],
	onClearHistory,
	onRestoreHistory,
	result,
}: {
	compact?: boolean;
	generatedAtLabel: string;
	history?: TextResultStageValue[];
	onClearHistory?: () => void;
	onRestoreHistory?: (result: ResultStageValue) => void;
	result: TextResultStageValue;
}) {
	function withHistory(content: React.ReactNode) {
		return (
			<div className="result-with-history" data-compact={compact}>
				{content}
				<ResultHistory
					generatedAtLabel={generatedAtLabel}
					history={history}
					onClear={onClearHistory}
					onRestore={(restoredResult) => onRestoreHistory?.(restoredResult)}
				/>
			</div>
		);
	}

	const imagePreview = createImagePreview(result);

	if (imagePreview.length > 0) {
		return withHistory(<ImagePreviewResult compact={compact} items={imagePreview} />);
	}

	if (isDiceStageResult(result)) {
		return (
			<DiceResultView
				compact={compact}
				generatedAtLabel={generatedAtLabel}
				history={history.filter(isDiceStageResult)}
				onClearHistory={onClearHistory}
				onRestoreHistory={(restoredResult) => onRestoreHistory?.(restoredResult)}
				result={result}
			/>
		);
	}

	if (isCoinFlipStageResult(result)) {
		return (
			<CoinFlipResultView
				generatedAtLabel={generatedAtLabel}
				history={history}
				onClearHistory={onClearHistory}
				onRestoreHistory={(restoredResult) => onRestoreHistory?.(restoredResult)}
				result={result}
			/>
		);
	}

	if (result.kind === "palette" && Array.isArray(result.result) && isStringArray(result.result)) {
		return withHistory(
			<div className="palette-result">
				{result.result.map((colour) => (
					<div className="swatch" key={colour} style={{ background: colour }}>
						<span>{colour}</span>
					</div>
				))}
			</div>,
		);
	}

	if (result.kind === "fields" && Array.isArray(result.result) && isRecordArray(result.result)) {
		if (isColourRecordArray(result.result)) {
			return withHistory(
				<div className="colour-records-result">
					{result.result.map((record) => (
						<article
							className="colour-card"
							key={`${record.hex}-${record.rgb}`}
							style={{ background: record.primary }}
						>
							<strong>{record.primary}</strong>
							<span>
								{record.palette} / {record.format}
							</span>
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
									<dd>
										W {record.contrastWhite} / B {record.contrastBlack}
									</dd>
								</div>
								<div>
									<dt>AA</dt>
									<dd>{record.wcagAaNormal}</dd>
								</div>
							</dl>
						</article>
					))}
				</div>,
			);
		}

		if (compact) {
			return withHistory(
				<RecordPreviewResult
					items={createRecordPreview(result.result)}
					total={result.result.length}
				/>,
			);
		}

		const columns = uniqueKeys(result.result);

		return withHistory(
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
			</div>,
		);
	}

	if (
		result.kind === "fields" &&
		!Array.isArray(result.result) &&
		typeof result.result !== "string"
	) {
		const fieldDisplay = createFieldDisplayModel(result.result);

		return withHistory(
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
			</dl>,
		);
	}

	const text = formatTextResult(result.result);

	return withHistory(
		<pre className="text-result" data-density={textResultDensity(text)}>
			{text}
		</pre>,
	);
}

function RecordPreviewResult({ items, total }: { items: RecordPreviewItem[]; total: number }) {
	const visibleItems = items.slice(0, 4);

	return (
		<div className="record-preview-result">
			<div className="record-preview-list">
				{visibleItems.map((item, index) => (
					<div className="record-preview-item" key={`${item.label}-${item.value}-${index}`}>
						<span>{item.label}</span>
						<strong>{item.value}</strong>
					</div>
				))}
			</div>
			{total > visibleItems.length ? (
				<p className="record-preview-more">+{total - visibleItems.length} more</p>
			) : null}
		</div>
	);
}

function ImagePreviewResult({ compact, items }: { compact: boolean; items: ImagePreviewItem[] }) {
	const visibleItems = compact ? items.slice(0, 4) : items;

	return (
		<div className="image-preview-result" data-compact={compact}>
			<div className="image-preview-grid">
				{visibleItems.map((item) => (
					<a
						className="image-preview-item"
						href={item.src}
						key={`${item.label}-${item.src}`}
						rel="noreferrer"
						target="_blank"
					>
						<img alt={item.alt} src={item.src} />
						<span>{item.label}</span>
					</a>
				))}
			</div>
			{compact && items.length > 4 ? (
				<p className="image-preview-more">+{items.length - 4} more</p>
			) : null}
		</div>
	);
}
