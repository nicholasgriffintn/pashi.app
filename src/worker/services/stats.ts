import { isRecord } from "../../shared/records";
import type { McpKindUsage, ToolUsage, UsageStats } from "../../shared/stats";
import { asArray, asNumber, asRecord, asString } from "../utils/json-guards";
import { listConverterTools } from "./converters/catalogue";
import { listGeneratorTools } from "./generators/catalogue/index";

export interface StatsEnv {
	ANALYTICS_ACCOUNT_ID?: string;
	ANALYTICS_API_TOKEN?: string;
}

export type StatsResult =
	| { stats: UsageStats; status: "ok" }
	| { status: "not_configured" | "unavailable" };

const DATASET = "pashi_events";
const WINDOW_DAYS = 7;
const CACHE_TTL_SECONDS = 600;
const TOP_TOOLS = 20;
const MCP_KIND_LIMIT = 20;
const SQL_TIMEOUT_MS = 8_000;
const WINDOW = `timestamp > NOW() - INTERVAL '${WINDOW_DAYS}' DAY`;

const EVENT_TOTALS_SQL = `SELECT blob1 AS name, SUM(_sample_interval) AS events FROM ${DATASET} WHERE ${WINDOW} GROUP BY name ORDER BY events DESC`;
const TOOL_USAGE_SQL = `SELECT blob2 AS tool, SUM(_sample_interval) AS runs, sumIf(_sample_interval, blob5 = 'error') AS errors FROM ${DATASET} WHERE ${WINDOW} AND blob2 != '' AND (blob1 = 'tool_run' OR blob1 = 'mcp_call') GROUP BY tool ORDER BY runs DESC LIMIT 200`;
const MCP_KINDS_SQL = `SELECT blob4 AS kind, SUM(_sample_interval) AS calls, sumIf(_sample_interval, blob5 = 'error') AS errors FROM ${DATASET} WHERE ${WINDOW} AND blob1 = 'mcp_call' AND blob4 != '' GROUP BY kind ORDER BY calls DESC LIMIT ${MCP_KIND_LIMIT}`;

function toolDirectory() {
	const directory = new Map<string, Pick<ToolUsage, "label" | "toolType">>();

	for (const tool of listGeneratorTools()) {
		directory.set(tool.id, { label: tool.label, toolType: "generator" });
	}

	for (const tool of listConverterTools()) {
		directory.set(tool.id, { label: tool.label, toolType: "converter" });
	}

	return directory;
}

async function runSql(env: Required<StatsEnv>, sql: string) {
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.ANALYTICS_ACCOUNT_ID)}/analytics_engine/sql`,
		{
			body: sql,
			headers: { Authorization: `Bearer ${env.ANALYTICS_API_TOKEN}` },
			method: "POST",
			signal: AbortSignal.timeout(SQL_TIMEOUT_MS),
		},
	);

	if (!response.ok) {
		throw new Error(`Analytics SQL API returned HTTP ${response.status}: ${await response.text()}`);
	}

	const payload = asRecord(await response.json());

	return asArray(payload?.data).filter(isRecord);
}

function countOf(value: unknown) {
	const count = typeof value === "string" ? Number(value) : asNumber(value);

	return count !== undefined && Number.isFinite(count) ? Math.round(count) : 0;
}

async function computeStats(env: Required<StatsEnv>): Promise<UsageStats> {
	const [eventRows, toolRows, mcpRows] = await Promise.all([
		runSql(env, EVENT_TOTALS_SQL),
		runSql(env, TOOL_USAGE_SQL),
		runSql(env, MCP_KINDS_SQL),
	]);
	const events = eventRows.flatMap((row) => {
		const name = asString(row.name);

		return name ? [{ count: countOf(row.events), name }] : [];
	});
	const directory = toolDirectory();
	const tools = toolRows
		.flatMap((row) => {
			const id = asString(row.tool);
			const entry = id ? directory.get(id) : undefined;

			return id && entry
				? [
						{
							errors: countOf(row.errors),
							id,
							runs: countOf(row.runs),
							...entry,
						},
					]
				: [];
		})
		.slice(0, TOP_TOOLS);
	const mcpKinds = mcpRows.flatMap((row): McpKindUsage[] => {
		const kind = asString(row.kind);

		return kind ? [{ calls: countOf(row.calls), errors: countOf(row.errors), kind }] : [];
	});
	const totalFor = (name: string) => events.find((event) => event.name === name)?.count ?? 0;
	const to = new Date();

	return {
		conversions: {
			completed: totalFor("conversion_complete"),
			failed: totalFor("conversion_failed"),
		},
		events,
		from: new Date(to.getTime() - WINDOW_DAYS * 86_400_000).toISOString(),
		mcpKinds,
		to: to.toISOString(),
		tools,
	};
}

export async function readUsageStats(env: StatsEnv): Promise<StatsResult> {
	const { ANALYTICS_ACCOUNT_ID, ANALYTICS_API_TOKEN } = env;

	if (!ANALYTICS_ACCOUNT_ID || !ANALYTICS_API_TOKEN) {
		return { status: "not_configured" };
	}

	const cache = caches.default;
	const key = new Request("https://pashi.app/internal/usage-stats/v1");
	const hit = await cache.match(key).catch(() => undefined);

	if (hit) {
		return { stats: await hit.json<UsageStats>(), status: "ok" };
	}

	try {
		const stats = await computeStats({
			ANALYTICS_ACCOUNT_ID,
			ANALYTICS_API_TOKEN,
		});

		await cache
			.put(
				key,
				Response.json(stats, {
					headers: { "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}` },
				}),
			)
			.catch(() => undefined);

		return { stats, status: "ok" };
	} catch (error) {
		console.error("pashi.stats_failed", error);

		return { status: "unavailable" };
	}
}
