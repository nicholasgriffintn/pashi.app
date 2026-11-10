import { isRecord } from "../../shared/records";
import type { ErrorCode } from "../utils/http";

export interface McpImageContent {
	data: string;
	mimeType: string;
	type: "image";
}

export interface McpTextContent {
	text: string;
	type: "text";
}

export type McpContentBlock = McpImageContent | McpTextContent;

export interface McpToolResult {
	content: McpContentBlock[];
	isError: boolean;
	structuredContent?: Record<string, unknown>;
}

export class McpToolError extends Error {
	readonly code: ErrorCode;

	constructor(message: string, code: ErrorCode) {
		super(message);
		this.name = "McpToolError";
		this.code = code;
	}
}

export function jsonToolResult(value: unknown): McpToolResult {
	return {
		content: [{ text: JSON.stringify(value, null, 2), type: "text" }],
		isError: false,
		...(isRecord(value) ? { structuredContent: value } : {}),
	};
}

export function imageToolResult(
	image: Omit<McpImageContent, "type">,
	summary: string,
	metadata: Record<string, unknown>,
): McpToolResult {
	return {
		content: [
			{ text: summary, type: "text" },
			{ data: image.data, mimeType: image.mimeType, type: "image" },
		],
		isError: false,
		structuredContent: metadata,
	};
}

export function errorToolResult(error: unknown): McpToolResult {
	if (error instanceof McpToolError) {
		return {
			content: [{ text: `${error.message} (${error.code})`, type: "text" }],
			isError: true,
			structuredContent: { code: error.code, error: error.message },
		};
	}

	return {
		content: [
			{ text: error instanceof Error ? error.message : "The tool call failed.", type: "text" },
		],
		isError: true,
	};
}
