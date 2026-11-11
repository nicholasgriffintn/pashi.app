import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { toolPagePath, type UsageStats } from "../../shared/stats";
import { useStaticPageMetadata } from "../lib/use-document-metadata";
import { useUsageStats } from "../lib/use-usage-stats";

const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

interface StatRow {
	cells: Record<string, ReactNode>;
	key: string;
}

function formatCount(value: number) {
	return NUMBER_FORMAT.format(value);
}

function StatBar({ max, value }: { max: number; value: number }) {
	const share = max > 0 ? Math.max((value / max) * 100, 2) : 0;

	return (
		<span aria-hidden="true" className="stat-bar">
			<span className="stat-bar-fill" style={{ width: `${share}%` }} />
		</span>
	);
}

function StatTable({ empty, head, rows }: { empty: string; head: string[]; rows: StatRow[] }) {
	if (rows.length === 0) {
		return <p>{empty}</p>;
	}

	return (
		<div className="stat-table-wrap">
			<table className="stat-table">
				<thead>
					<tr>
						{head.map((label) => (
							<th key={label} scope="col">
								{label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.key}>
							{head.map((label) => (
								<td key={label}>{row.cells[label]}</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function StatsTables({ stats }: { stats: UsageStats }) {
	const { completed, failed } = stats.conversions;
	const maxEvents = Math.max(0, ...stats.events.map((event) => event.count));
	const maxTools = Math.max(0, ...stats.tools.map((tool) => tool.runs));
	const maxMcp = Math.max(0, ...stats.mcpKinds.map((kind) => kind.calls));
	const maxConversions = Math.max(completed, failed);

	return (
		<>
			<p>
				{DATE_FORMAT.format(new Date(stats.from))} to {DATE_FORMAT.format(new Date(stats.to))}.
			</p>
			<h2>Events</h2>
			<StatTable
				empty="No events recorded yet."
				head={["Event", "Count", "Share"]}
				rows={stats.events.map((event) => ({
					cells: {
						Count: formatCount(event.count),
						Event: <code>{event.name}</code>,
						Share: <StatBar max={maxEvents} value={event.count} />,
					},
					key: event.name,
				}))}
			/>
			<h2>Top tools</h2>
			<StatTable
				empty="No tool runs recorded yet."
				head={["Tool", "Runs", "Errors", "Share"]}
				rows={stats.tools.map((tool) => ({
					cells: {
						Errors: formatCount(tool.errors),
						Runs: formatCount(tool.runs),
						Share: <StatBar max={maxTools} value={tool.runs} />,
						Tool: <Link to={toolPagePath(tool)}>{tool.label}</Link>,
					},
					key: tool.id,
				}))}
			/>
			<h2>MCP calls</h2>
			<StatTable
				empty="No MCP calls recorded yet."
				head={["Method or tool", "Calls", "Errors", "Share"]}
				rows={stats.mcpKinds.map((kind) => ({
					cells: {
						Calls: formatCount(kind.calls),
						Errors: formatCount(kind.errors),
						"Method or tool": <code>{kind.kind}</code>,
						Share: <StatBar max={maxMcp} value={kind.calls} />,
					},
					key: kind.kind,
				}))}
			/>
			<h2>Conversions</h2>
			<StatTable
				empty="No conversions recorded yet."
				head={["Outcome", "Count", "Share"]}
				rows={
					maxConversions > 0
						? [
								{
									cells: {
										Count: formatCount(completed),
										Outcome: "Completed",
										Share: <StatBar max={maxConversions} value={completed} />,
									},
									key: "completed",
								},
								{
									cells: {
										Count: formatCount(failed),
										Outcome: "Failed",
										Share: <StatBar max={maxConversions} value={failed} />,
									},
									key: "failed",
								},
							]
						: []
				}
			/>
		</>
	);
}

export function StatsPage() {
	useStaticPageMetadata("/stats");
	const { data, isError, isPending } = useUsageStats();

	return (
		<main className="page">
			<h1>Stats</h1>
			<p className="page-lede">
				How Pashi has been used over the last seven days. Counts are sampled estimates and contain
				no personal data: just event names, tool ids and outcomes.
			</p>
			{isPending ? <output>Loading stats</output> : null}
			{isError ? <output>Stats are not available right now. Check back soon.</output> : null}
			{data ? <StatsTables stats={data} /> : null}
		</main>
	);
}
