import { type AnchorHTMLAttributes, useMemo } from "react";

import type { GeneratorInfoTool } from "../lib/generator-info";
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
	tool: GeneratorInfoTool;
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
	tool: GeneratorInfoTool,
	input: string,
	fields: Record<string, string>,
	formats: string[],
) {
	if (tool.result.kind === "image") {
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

	if (result.kind === "image") {
		return (
			<div className="result-actions" aria-label="Result actions">
				<ActionLink
					download={`pashi-${tool.id}`}
					href={result.src}
					icon="↓"
					label="Download image"
				/>
				<ActionButton
					icon="⧉"
					label="Copy image"
					onClick={() => runAction(() => copyImage(result.src), "Image copied")}
				/>
				<ActionButton
					icon="⌘"
					label="Copy image URL"
					onClick={() => runAction(() => copyText(result.src), "Image URL copied")}
				/>
				<ActionLink href={result.src} icon="↗" label="Open image" rel="noreferrer" target="_blank" />
				<ActionButton icon="↻" label="Regenerate" onClick={onRegenerate} />
				<ActionButton icon="×" label="Clear result" onClick={onClear} />
			</div>
		);
	}

	return (
		<div className="result-actions" aria-label="Result actions">
			<ActionButton
				icon="⧉"
				label="Copy result"
				onClick={() => runAction(() => copyText(resultToText(result)), "Copied")}
			/>
			{exportHrefs.map(({ format, href }) => (
				<ActionLink
					download={`pashi-${tool.id}.${format}`}
					href={href}
					icon={formatIcon(format)}
					key={format}
					label={`Download ${format.toUpperCase()}`}
				/>
			))}
			<ActionButton icon="↻" label="Regenerate" onClick={onRegenerate} />
			<ActionButton icon="×" label="Clear result" onClick={onClear} />
		</div>
	);
}
