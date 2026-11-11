import { errorCodeForStatus, errorJson, json } from "../../utils/http";
import {
	hasQueuedConversionServices,
	isAiBindingAvailable,
	isConverterFeatureEnabled,
} from "./availability";
import { findConverterTool } from "./catalogue";
import {
	createQueuedConversionLookupResponse,
	listSlackmojiPresets,
	readSlackmojiPresetSource,
	type ConversionEnv,
} from "./conversion-pipeline";
import { ConverterRequestError, converterHandlers } from "./handlers";
import { createImageFormatResponse } from "./image";
import { applyConverterPresetFields } from "./presets";
import type { ConverterRequest, ConverterTool } from "./types";

export async function createConverterResponse(
	type: string,
	request: ConverterRequest,
	env?: ConversionEnv,
	params?: URLSearchParams,
	applicationId?: string,
) {
	const tool = findConverterTool(type);

	if (!tool) {
		return json({ error: "Converter not found." }, 404);
	}

	const requestWithPresets: ConverterRequest = {
		...request,
		fields: applyConverterPresetFields(type, request.fields),
	};

	if (!isConverterFeatureEnabled(env)) {
		return json({ error: "Conversions are not available." }, 503);
	}

	if (env && params) {
		const converterPresetResponse = await createConverterPresetResponse(tool.id, params, env);

		if (converterPresetResponse) {
			return converterPresetResponse;
		}
	}

	if (
		env &&
		(tool.id === "audio-format" ||
			tool.id === "document-format" ||
			tool.id === "image-format" ||
			tool.id === "slack-hdr-emoji" ||
			tool.id === "slackmoji" ||
			tool.id === "video-format")
	) {
		const queuedResponse = await createQueuedConversionLookupResponse(
			tool.id,
			requestWithPresets.fields,
			env,
			applicationId ?? "",
		);

		if (queuedResponse) {
			return queuedResponse;
		}
	}

	if (tool.id === "image-format" && requestWithPresets.input.trim()) {
		return createImageFormatResponse(requestWithPresets);
	}

	if (tool.runtime === "container" && !hasQueuedConversionServices(env)) {
		return json({ error: `${tool.label} conversion needs media conversion services.` }, 503);
	}

	if (tool.runtime !== "worker" || !tool.endpoint) {
		return json({ error: `${tool.label} conversion needs an API-backed implementation.` }, 501);
	}

	if (tool.capabilities?.usesAiBinding && !isAiBindingAvailable(env)) {
		return errorJson(`${tool.label} conversion is not available.`, 503, "unavailable");
	}

	if (tool.input.required && !hasConverterInput(tool, requestWithPresets)) {
		const action = tool.capabilities?.binaryInput ? "Upload a" : "Paste";

		return json({ error: `${action} ${tool.input.label.toLowerCase()} to convert.` }, 400);
	}

	const handler = converterHandlers[tool.id];

	if (!handler) {
		return json({ error: "Converter handler is not configured." }, 501);
	}

	try {
		return json(await handler(requestWithPresets, { env }));
	} catch (error) {
		if (error instanceof ConverterRequestError) {
			return errorJson(error.message, error.status, errorCodeForStatus(error.status));
		}

		throw error;
	}
}

function hasConverterInput(tool: ConverterTool, request: ConverterRequest) {
	return tool.capabilities?.binaryInput
		? Boolean(request.file?.bytes.byteLength)
		: Boolean(request.input.trim());
}

async function createConverterPresetResponse(
	converterId: string,
	params: URLSearchParams,
	env: ConversionEnv,
) {
	if (converterId !== "slackmoji") {
		return undefined;
	}

	if (params.has("presets")) {
		return json(await listSlackmojiPresets(env));
	}

	const preset = params.get("preset");

	if (!preset) {
		return undefined;
	}

	const source = await readSlackmojiPresetSource(env, preset);

	if (!source) {
		return json({ error: "Preset not found." }, 404);
	}

	const headers = new Headers({
		"Cache-Control": "public, max-age=3600",
		"Content-Type": source.contentType,
	});

	return new Response(source.body, { headers });
}
