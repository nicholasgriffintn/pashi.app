import type { ConverterRequest } from "./types";
import { json } from "../../utils/http";
import { findConverterTool } from "./catalogue";
import { ConverterRequestError, converterHandlers } from "./handlers";
import { createImageFormatResponse } from "./image";
import { createQueuedConversionLookupResponse, type ConversionEnv } from "./conversion-pipeline";
import { createFeatureStatus } from "../features";

export async function createConverterResponse(type: string, request: ConverterRequest, env?: ConversionEnv) {
	const tool = findConverterTool(type);
	if (!tool) {
		return json({ error: "Converter not found." }, 404);
	}

	if (!env || !createFeatureStatus(env).conversions.available) {
		return json({ error: "Conversions are not available." }, 503);
	}

	if (env && (
		tool.id === "audio-format" ||
		tool.id === "document-format" ||
		tool.id === "image-format" ||
		tool.id === "video-format"
	)) {
		const queuedResponse = await createQueuedConversionLookupResponse(tool.id, request.fields, env);
		if (queuedResponse) {
			return queuedResponse;
		}
	}

	if (tool.id === "image-format" && request.input.trim()) {
		return createImageFormatResponse(request);
	}

	if (tool.runtime !== "worker" || !tool.endpoint) {
		return json({ error: `${tool.label} conversion needs an API-backed implementation.` }, 501);
	}

	if (tool.input.required && !request.input.trim()) {
		return json({ error: `Paste ${tool.input.label.toLowerCase()} to convert.` }, 400);
	}

	const handler = converterHandlers[tool.id];
	if (!handler) {
		return json({ error: "Converter handler is not configured." }, 501);
	}

	try {
		return json(handler(request));
	} catch (error) {
		if (error instanceof ConverterRequestError) {
			return json({ error: error.message }, error.status);
		}
		throw error;
	}
}
