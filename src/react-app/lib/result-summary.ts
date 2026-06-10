import type { SlackmojiBatchResult } from "./converter-api";
import { formatGeneratedAt, isRecordArray, isStringArray, uniqueKeys } from "./result-format";
import type { ResultStageValue, TextResultStageValue } from "./result-types";

export interface ResultDetail {
	href?: string;
	label: string;
	value: string;
}

export interface ResultSummary {
	details: ResultDetail[];
	footnote?: string;
	metrics: ResultDetail[];
	stat: string;
	title: string;
}

export function createResultSummary(result: ResultStageValue, generatedAtLabel: string): ResultSummary {
	if (result.kind === "image") {
		return createImageSummary(result, generatedAtLabel);
	}

	if (result.kind === "slackmoji-batch") {
		return createSlackmojiSummary(result.items, generatedAtLabel, result.generatedAt);
	}

	return createTextSummary(result, generatedAtLabel);
}

function createImageSummary(result: Extract<ResultStageValue, { kind: "image" }>, generatedAtLabel: string): ResultSummary {
	const details: ResultDetail[] = [
		{ label: "Kind", value: "Image" },
		...(result.downloadName ? [{ label: "Filename", value: result.downloadName }] : []),
		...(result.sourceUrl ? [{ href: result.sourceUrl, label: "Source URL", value: result.sourceUrl }] : []),
		{ href: result.src, label: "Preview URL", value: result.src },
		...createdAtDetail(result.generatedAt, generatedAtLabel),
	];

	return {
		details,
		metrics: [{ label: "Actions", value: "Download, copy, open" }],
		stat: "Image preview",
		title: result.alt,
	};
}

function createSlackmojiSummary(items: SlackmojiBatchResult[], generatedAtLabel: string, generatedAt?: string): ResultSummary {
	const complete = items.filter((item) => item.status === "complete").length;
	const failed = items.filter((item) => item.status === "failed").length;
	const ready = items.filter((item) => item.downloadUrl).length;
	const pending = items.length - complete - failed;

	return {
		details: [
			{ label: "Kind", value: "Slackmoji batch" },
			{ label: "Effects", value: items.map((item) => item.effect).join(", ") },
			...createdAtDetail(generatedAt, generatedAtLabel),
		],
		metrics: [
			{ label: "Total", value: String(items.length) },
			{ label: "Ready", value: String(ready) },
			...(pending > 0 ? [{ label: "Pending", value: String(pending) }] : []),
			...(failed > 0 ? [{ label: "Failed", value: String(failed) }] : []),
		],
		stat: `${ready}/${items.length} ready`,
		title: "Slackmoji batch",
	};
}

function createTextSummary(result: TextResultStageValue, generatedAtLabel: string): ResultSummary {
	const metrics = resultMetrics(result);
	const details = [
		{ label: "Kind", value: labelForKind(result.kind) },
		{ label: "Tool", value: result.label },
		...(result.meta ? [{ label: "Meta", value: result.meta }] : []),
		...createdAtDetail(result.generatedAt, generatedAtLabel),
		...downloadDetails(result),
	];

	return {
		details,
		footnote: sourceSummary(result.input),
		metrics,
		stat: metrics.map((metric) => `${metric.value} ${metric.label.toLowerCase()}`).join(" / "),
		title: result.label,
	};
}

function resultMetrics(result: TextResultStageValue): ResultDetail[] {
	if (Array.isArray(result.result)) {
		if (isRecordArray(result.result)) {
			return [
				{ label: "Rows", value: String(result.result.length) },
				{ label: "Columns", value: String(uniqueKeys(result.result).length) },
			];
		}

		if (isStringArray(result.result)) {
			return [{ label: "Items", value: String(result.result.length) }];
		}
	}

	if (typeof result.result === "string") {
		return [{ label: "Characters", value: String(result.result.length) }];
	}

	return [{ label: "Fields", value: String(Object.keys(result.result).length) }];
}

function downloadDetails(result: TextResultStageValue): ResultDetail[] {
	if (result.kind !== "fields" || typeof result.result === "string" || Array.isArray(result.result)) {
		return [];
	}

	const details: ResultDetail[] = [];
	const { downloadUrl, jobId, statusUrl } = result.result;
	if (jobId) {
		details.push({ label: "Job ID", value: jobId });
	}
	if ("downloadName" in result && result.downloadName) {
		details.push({ label: "Filename", value: result.downloadName });
	}
	if (downloadUrl) {
		details.push({ href: downloadUrl, label: "Download URL", value: downloadUrl });
	}
	if (statusUrl) {
		details.push({ href: statusUrl, label: "Status URL", value: statusUrl });
	}

	return details;
}

function createdAtDetail(value: string | undefined, label: string): ResultDetail[] {
	const formatted = formatGeneratedAt(value);
	return formatted ? [{ label, value: formatted }] : [];
}

function labelForKind(kind: TextResultStageValue["kind"]) {
	switch (kind) {
		case "fields":
			return "Fields";
		case "palette":
			return "Palette";
		case "text":
			return "Text";
	}
}

function sourceSummary(input: string) {
	if (!input.trim()) {
		return undefined;
	}

	const length = input.length;
	return `Source input: ${length} character${length === 1 ? "" : "s"}`;
}
