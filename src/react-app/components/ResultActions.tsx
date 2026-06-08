import { useMemo, useState } from "react";

import type { GenerateResult } from "../lib/generate-api";
import type { GeneratorInfoTool } from "../lib/generator-info";
import type { ResultStageValue } from "./ResultStage";

interface ResultActionsProps {
	exportFormats: string[];
	fields: Record<string, string>;
	input: string;
	onClear: () => void;
	onRegenerate: () => void;
	result: ResultStageValue;
	tool: GeneratorInfoTool;
}

export function ResultActions({
	exportFormats,
	fields,
	input,
	onClear,
	onRegenerate,
	result,
	tool,
}: ResultActionsProps) {
	const [status, setStatus] = useState("");
	const exportHrefs = useMemo(
		() => createExportHrefs(tool, input, fields, exportFormats),
		[exportFormats, fields, input, tool],
	);

	async function runAction(action: () => Promise<void>, successMessage: string) {
		try {
			await action();
			setStatus(successMessage);
		} catch {
			setStatus("Action failed");
		}
	}

	if (result.kind === "image") {
		const pngHref = tool.id === "qr" ? getImageFormatUrl(result.src, "png") : "";
		const svgHref = tool.id === "qr" ? getImageFormatUrl(result.src, "svg") : result.src;

		return (
			<div className="result-actions" aria-label="Result actions">
				{tool.id === "qr" ? (
					<a download="pashi-qr.png" href={pngHref}>
						PNG
					</a>
				) : null}
				<a download={`pashi-${tool.id}.svg`} href={svgHref}>
					SVG
				</a>
				<button onClick={() => runAction(() => copyImage(pngHref || svgHref), "Image copied")} type="button">
					Copy image
				</button>
				<button
					onClick={() => runAction(() => copyText(tool.id === "qr" ? input : result.src), "URL copied")}
					type="button"
				>
					{tool.id === "qr" ? "Copy URL" : "Copy image URL"}
				</button>
				{tool.id === "qr" && isHttpUrl(input) ? (
					<a href={input} rel="noreferrer" target="_blank">
						Open URL
					</a>
				) : null}
				<a href={result.src} rel="noreferrer" target="_blank">
					Open image
				</a>
				<button onClick={onRegenerate} type="button">
					Regenerate
				</button>
				<button onClick={onClear} type="button">
					Clear
				</button>
				{status ? <span>{status}</span> : null}
			</div>
		);
	}

	return (
		<div className="result-actions" aria-label="Result actions">
			<button onClick={() => runAction(() => copyText(resultToText(result)), "Copied")} type="button">
				Copy
			</button>
			{exportHrefs.map(({ format, href }) => (
				<a download={`pashi-${tool.id}.${format}`} href={href} key={format}>
					{format.toUpperCase()}
				</a>
			))}
			<button onClick={onRegenerate} type="button">
				Regenerate
			</button>
			<button onClick={onClear} type="button">
				Clear
			</button>
			{status ? <span>{status}</span> : null}
		</div>
	);
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

function resultToText(result: GenerateResult) {
	if (Array.isArray(result.result)) {
		return result.result.join("\n");
	}

	if (typeof result.result === "string") {
		return result.result;
	}

	return Object.entries(result.result)
		.map(([key, value]) => `${key}: ${value}`)
		.join("\n");
}

function getImageFormatUrl(src: string, format: "png" | "svg") {
	const url = new URL(src, window.location.origin);
	url.searchParams.set("format", format);
	return `${url.pathname}?${url.searchParams.toString()}`;
}

function isHttpUrl(value: string) {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
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
