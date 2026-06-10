import { type AnchorHTMLAttributes, useMemo } from "react";

import type { GeneratorInfoTool } from "../lib/generator-info";
import type { ConverterInfoTool } from "../lib/converter-api";
import type { ResultStageValue } from "../lib/result-types";
import { resultToText } from "../lib/result-format";

interface ResultActionsProps {
	exportFormats: string[];
	fields: Record<string, string>;
	input: string;
	onClear: () => void;
	onNotify: (message: string) => void;
	onRegenerate: () => void;
	result: ResultStageValue;
	tool: GeneratorInfoTool | ConverterInfoTool;
}

function ActionButton({
	icon,
	label,
	onClick,
}: {
	icon: string;
	label: string;
	onClick: () => void;
}) {
	return (
		<button aria-label={label} onClick={onClick} title={label} type="button">
			<span aria-hidden="true">{icon}</span>
		</button>
	);
}

function ActionLink({
	icon,
	label,
	...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
	icon: string;
	label: string;
}) {
	return (
		<a aria-label={label} title={label} {...props}>
			<span aria-hidden="true">{icon}</span>
		</a>
	);
}

function formatIcon(format: string) {
	switch (format.toLowerCase()) {
		case "csv":
			return "≡";
		case "json":
			return "{}";
		case "txt":
			return "T";
		default:
			return "↓";
	}
}

function createExportHrefs(
	tool: GeneratorInfoTool | ConverterInfoTool,
	input: string,
	fields: Record<string, string>,
	formats: string[],
) {
	if (!("result" in tool) || tool.result.kind === "image") {
		return [];
	}

	const params = new URLSearchParams();
	if (input) {
		params.set("input", input);
	}
	for (const [key, value] of Object.entries(fields)) {
		if (value) {
			params.set(key, value);
		}
	}

	const suffix = params.size > 0 ? `?${params.toString()}` : "";
	return formats.map((format) => ({
		format,
		href: `/export/${tool.id}/${format}${suffix}`,
	}));
}

function createTextDownloadHref(result: { mimeType?: string }, value: string) {
	return `data:${result.mimeType ?? "text/plain;charset=utf-8"},${encodeURIComponent(value)}`;
}

async function copyText(value: string) {
	await navigator.clipboard.writeText(value);
}

async function copyImage(src: string) {
	if (!("ClipboardItem" in window) || !navigator.clipboard.write) {
		throw new Error("Image clipboard is not supported.");
	}

	const response = await fetch(src);
	const blob = await response.blob();
	await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}

function copyableImageUrl(result: Extract<ResultStageValue, { kind: "image" }>) {
	return result.sourceUrl ?? result.src;
}

function copyableImageSrc(result: ResultStageValue) {
	if (result.kind === "image") {
		return copyableImageUrl(result);
	}

	return undefined;
}

function slackmojiDownloadUrls(result: Extract<ResultStageValue, { kind: "slackmoji-batch" }>) {
	return result.items
		.map((item) => item.downloadUrl)
		.filter((url) => url !== "");
}

function createResultText(result: ResultStageValue) {
	if (result.kind === "slackmoji-batch") {
		return result.items
			.map((item) => `${item.effect}: ${item.status}${item.downloadUrl ? ` (${item.downloadUrl})` : ""}`)
			.join("\n");
	}
	if (result.kind === "image") {
		return "";
	}

	return resultToText(result);
}

function resultDownloadUrl(result: ResultStageValue) {
	if (
		result.kind === "fields" &&
		!Array.isArray(result.result) &&
		typeof result.result !== "string" &&
		typeof result.result.downloadUrl === "string" &&
		result.result.downloadUrl
	) {
		return result.result.downloadUrl;
	}

	if (result.kind === "slackmoji-batch") {
		return result.items.find((item) => item.downloadUrl)?.downloadUrl;
	}

	return undefined;
}

export function ResultActions({
	exportFormats,
	fields,
	input,
	onClear,
	onNotify,
	onRegenerate,
	result,
	tool,
}: ResultActionsProps) {
	const downloadUrl = resultDownloadUrl(result);
	const exportHrefs = useMemo(
		() => createExportHrefs(tool, input, fields, exportFormats),
		[exportFormats, fields, input, tool],
	);

	async function runAction(action: () => Promise<void>, successMessage: string) {
		try {
			await action();
			onNotify(successMessage);
		} catch {
			onNotify("Action failed");
		}
	}

	if (result.kind === "slackmoji-batch") {
		const urls = slackmojiDownloadUrls(result);

		return (
			<div className="result-actions" aria-label="Result actions">
				<ActionButton
					icon="⧉"
					label="Copy batch summary"
					onClick={() => runAction(() => copyText(createResultText(result)), "Copied")}
				/>
				{urls.length > 0 ? (
					<ActionButton
						icon="⌘"
						label={urls.length === 1 ? "Copy image URL" : "Copy image URLs"}
						onClick={() => runAction(() => copyText(urls.join("\n")), urls.length === 1 ? "Image URL copied" : "Image URLs copied")}
					/>
				) : null}
				<ActionButton icon="↻" label="Regenerate" onClick={onRegenerate} />
				<ActionButton icon="×" label="Clear result" onClick={onClear} />
			</div>
		);
	}

	if (result.kind === "image") {
		const imageSrc = copyableImageSrc(result);
		const downloadName = result.downloadName ?? `pashi-${tool.id}`;

		return (
			<div className="result-actions" aria-label="Result actions">
				<ActionLink
					download={downloadName}
					href={result.src}
					icon="↓"
					label="Download image"
				/>
				<ActionButton
					icon="⧉"
					label="Copy image"
					onClick={() => runAction(() => copyImage(imageSrc ?? result.src), "Image copied")}
				/>
				<ActionButton
					icon="⌘"
					label="Copy image URL"
					onClick={() => runAction(() => copyText(imageSrc ?? result.src), "Image URL copied")}
				/>
				<ActionLink href={result.src} icon="↗" label="Open image" rel="noreferrer" target="_blank" />
				<ActionButton icon="↻" label="Regenerate" onClick={onRegenerate} />
				<ActionButton icon="×" label="Clear result" onClick={onClear} />
			</div>
		);
	}

	const resultText = createResultText(result);

	return (
		<div className="result-actions" aria-label="Result actions">
			{resultText ? (
				<ActionButton
					icon="⧉"
					label="Copy result"
					onClick={() => runAction(() => copyText(resultText), "Copied")}
				/>
			) : null}
			{exportHrefs.map(({ format, href }) => (
				<ActionLink
					download={`pashi-${tool.id}.${format}`}
					href={href}
					icon={formatIcon(format)}
					key={format}
					label={`Download ${format.toUpperCase()}`}
				/>
			))}
			{"downloadName" in result && result.downloadName ? (
				<ActionLink
					download={result.downloadName}
					href={createTextDownloadHref(result, resultToText(result))}
					icon="↓"
					label="Download file"
				/>
			) : null}
			{downloadUrl ? (
				<ActionLink
					href={downloadUrl}
					icon="↓"
					label="Download converted file"
				/>
			) : null}
			<ActionButton icon="↻" label="Regenerate" onClick={onRegenerate} />
			<ActionButton icon="×" label="Clear result" onClick={onClear} />
		</div>
	);
}
