export type EventName =
	| "ai_call"
	| "conversion_complete"
	| "conversion_failed"
	| "conversion_queued"
	| "export_run"
	| "mcp_call"
	| "rate_limited"
	| "tool_run";

export interface EventFields {
	durationMs?: number;
	kind?: string;
	name: EventName;
	outcome?: "error" | "ok";
	toolId?: string;
	toolType?: "converter" | "generator";
}

export interface EventEnv {
	EVENTS?: AnalyticsEngineDataset;
}

export function recordEvent(env: EventEnv, fields: EventFields) {
	if (!env.EVENTS) {
		return;
	}

	try {
		env.EVENTS.writeDataPoint({
			blobs: [
				fields.name,
				fields.toolId ?? "",
				fields.toolType ?? "",
				fields.kind ?? "",
				fields.outcome ?? "ok",
			],
			doubles: [fields.durationMs ?? 0],
			indexes: [fields.name],
		});
	} catch (error) {
		console.error("pashi.event_write_failed", error);
	}
}
