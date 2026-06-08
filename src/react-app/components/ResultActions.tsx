import { useMemo, useState } from "react";

import type { GenerateResult } from "../lib/generate-api";
import type { GeneratorInfoTool } from "../lib/generator-info";
import type { ResultStageValue } from "./ResultStage";

interface ResultActionsProps {
	input: string;
	onClear: () => void;
	onRegenerate: () => void;
	result: ResultStageValue;
	tool: GeneratorInfoTool;
}

export function ResultActions({
	input,
	onClear,
	onRegenerate,
	result,
	tool,
}: ResultActionsProps) {
	const [status, setStatus] = useState("");
	const textDownloadHref = useMemo(() => {
		if (result.kind === "qr") {
			return "";
		}

		return `data:text/plain;charset=utf-8,${encodeURIComponent(resultToText(result))}`;
	}, [result]);

	async function runAction(action: () => Promise<void>, successMessage: string) {
		try {
			await action();
			setStatus(successMessage);
		} catch {
			setStatus("Action failed");
		}
	}

	if (result.kind === "qr") {
		const pngHref = getQrFormatUrl(result.src, "png");
		const svgHref = getQrFormatUrl(result.src, "svg");

		return (
			<div className="result-actions" aria-label="Result actions">
				<a download="pashi-qr.png" href={pngHref}>
					PNG
				</a>
				<a download="pashi-qr.svg" href={svgHref}>
					SVG
				</a>
				<button onClick={() => runAction(() => copyImage(pngHref), "Image copied")} type="button">
					Copy image
				</button>
				<button onClick={() => runAction(() => copyText(input), "URL copied")} type="button">
					Copy URL
				</button>
				<a href={input} rel="noreferrer" target="_blank">
					Open
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
			<a download={`pashi-${tool.id}.txt`} href={textDownloadHref}>
				Download
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

function getQrFormatUrl(src: string, format: "png" | "svg") {
	const url = new URL(src, window.location.origin);
	url.searchParams.set("format", format);
	return `${url.pathname}?${url.searchParams.toString()}`;
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
