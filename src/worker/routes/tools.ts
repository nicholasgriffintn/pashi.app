import { Hono } from "hono";

import {
	aiClientFor,
	requireConversionAccess,
	requirePolychat,
} from "../middleware/polychat-access";
import { isExpensiveGeneratorId } from "../security/policies";
import { createApiIndexResponse } from "../services/api-info";
import { createConverterResponse, findConverterTool } from "../services/converters";
import { createQueuedConversionUploadResponse } from "../services/converters/conversion-pipeline";
import { isQueuedConversionUploadRequest } from "../services/converters/conversion-routing";
import { recordEvent } from "../services/events";
import { createGeneratorResponse, findGenerator } from "../services/generators/index";
import {
	createGeneratorRequest,
	createGeneratorRequestFromSearchParams,
	usesAiMode,
} from "../services/generators/request";
import { createHealthResponse } from "../services/health";
import { readConverterBody, readConverterUploadBody, readGeneratorBody } from "../utils/body";
import { withCacheControl } from "../utils/cache";
import { errorJson } from "../utils/http";
import { guard, type AppContext } from "./context";

export function createToolRoutes() {
	const routes = new Hono<AppContext>({ strict: false });

	routes.get("/info", (c) =>
		withCacheControl(Response.json(createApiIndexResponse(c.env)), "catalogue"),
	);

	routes.get("/health", (c) => createHealthResponse(c.env));

	routes.get("/:type", async (c) => {
		const type = c.req.param("type");
		const params = new URL(c.req.url).searchParams;
		const request = createGeneratorRequestFromSearchParams(params);
		const generatorTool = findGenerator(type);
		const startedAt = Date.now();

		if (generatorTool) {
			const isAiMode = Boolean(generatorTool.modes?.includes("ai")) && usesAiMode(request);

			if (isAiMode) {
				const denied = await requirePolychat(c);

				if (denied) {
					return denied;
				}
			}

			const limited = await guard(c, {
				isAiMode,
				isExpensiveGenerator: isExpensiveGeneratorId(generatorTool.id),
			});

			if (limited) {
				recordEvent(c.env, { name: "rate_limited", toolId: generatorTool.id });

				return limited;
			}

			const response = await createGeneratorResponse(type, request, params, c.env, aiClientFor(c));

			recordEvent(c.env, {
				durationMs: Date.now() - startedAt,
				name: isAiMode ? "ai_call" : "tool_run",
				outcome: response.ok ? "ok" : "error",
				toolId: generatorTool.id,
				toolType: "generator",
			});

			return response;
		}

		const converterTool = findConverterTool(type);

		if (converterTool) {
			if (converterTool.runtime === "container") {
				const denied = await requireConversionAccess(c);

				if (denied) {
					return denied;
				}

				const application = c.get("application");

				if (!application) {
					return errorJson("API key authentication is unavailable.", 503, "unavailable");
				}

				const limited = await guard(c, { isContainerRuntime: true });

				if (limited) {
					recordEvent(c.env, { name: "rate_limited", toolId: converterTool.id });

					return limited;
				}

				return createConverterResponse(type, request, c.env, params, application.id);
			}

			const limited = await guard(c, {
				usesAiBinding: converterTool.capabilities?.usesAiBinding,
			});

			if (limited) {
				recordEvent(c.env, { name: "rate_limited", toolId: converterTool.id });

				return limited;
			}

			const response = await createConverterResponse(type, request, c.env, params);

			recordEvent(c.env, {
				durationMs: Date.now() - startedAt,
				name: "tool_run",
				outcome: response.ok ? "ok" : "error",
				toolId: converterTool.id,
				toolType: "converter",
			});

			return response;
		}

		return errorJson("Unknown tool type.", 404, "not_found");
	});

	routes.post("/:type", async (c) => {
		const type = c.req.param("type");
		const generatorTool = findGenerator(type);
		const startedAt = Date.now();

		if (generatorTool) {
			const body = await readGeneratorBody(c);
			const request = createGeneratorRequest(body.input, body.fields);
			const isAiMode = Boolean(generatorTool.modes?.includes("ai")) && usesAiMode(request);

			if (isAiMode) {
				const denied = await requirePolychat(c);

				if (denied) {
					return denied;
				}
			}

			const limited = await guard(c, {
				isAiMode,
				isExpensiveGenerator: isExpensiveGeneratorId(generatorTool.id),
			});

			if (limited) {
				recordEvent(c.env, { name: "rate_limited", toolId: generatorTool.id });

				return limited;
			}

			const response = await createGeneratorResponse(
				type,
				request,
				new URLSearchParams(),
				c.env,
				aiClientFor(c),
			);

			recordEvent(c.env, {
				durationMs: Date.now() - startedAt,
				name: isAiMode ? "ai_call" : "tool_run",
				outcome: response.ok ? "ok" : "error",
				toolId: generatorTool.id,
				toolType: "generator",
			});

			return response;
		}

		const converterTool = findConverterTool(type);

		if (converterTool) {
			if (converterTool.runtime === "container") {
				const denied = await requireConversionAccess(c);

				if (denied) {
					return denied;
				}

				const application = c.get("application");

				if (!application) {
					return errorJson("API key authentication is unavailable.", 503, "unavailable");
				}

				const contentType = c.req.header("content-type")?.toLowerCase() ?? "";
				const isUpload = isQueuedConversionUploadRequest(converterTool.id, contentType);
				const limited = await guard(c, { isContainerRuntime: true, isUpload });

				if (limited) {
					recordEvent(c.env, { name: "rate_limited", toolId: converterTool.id });

					return limited;
				}

				if (isUpload) {
					const uploaded = await createQueuedConversionUploadResponse(
						converterTool.id,
						c.req.raw,
						c.env,
						application.id,
						type,
					);

					recordEvent(c.env, {
						name: "conversion_queued",
						outcome: uploaded.ok ? "ok" : "error",
						toolId: converterTool.id,
						toolType: "converter",
					});

					return uploaded;
				}

				const body = await readConverterBody(c);

				return createConverterResponse(
					type,
					createGeneratorRequest(body.input, body.fields),
					c.env,
					undefined,
					application.id,
				);
			}

			const limited = await guard(c, {
				usesAiBinding: converterTool.capabilities?.usesAiBinding,
			});

			if (limited) {
				recordEvent(c.env, { name: "rate_limited", toolId: converterTool.id });

				return limited;
			}

			const body = converterTool.capabilities?.binaryInput
				? await readConverterUploadBody(c)
				: await readConverterBody(c);
			const response = await createConverterResponse(
				type,
				{ ...createGeneratorRequest(body.input, body.fields), file: body.file },
				c.env,
			);

			recordEvent(c.env, {
				durationMs: Date.now() - startedAt,
				name: "tool_run",
				outcome: response.ok ? "ok" : "error",
				toolId: converterTool.id,
				toolType: "converter",
			});

			return response;
		}

		return errorJson("Unknown tool type.", 404, "not_found");
	});

	return routes;
}
