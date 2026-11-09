import { Button } from "../Button";
import type { PolisStatus } from "../engine/protocol";
import { formatCount, formatMoney, formatPercent, yearOf } from "../format";
import { MONTH_DAYS, type MonthlyMetrics } from "../library/index";
import type { PolisEngine } from "../usePolisEngine";
import { SeriesLegend, TrendChart } from "./TrendChart";

const CHARTS: {
	title: string;
	metric: keyof MonthlyMetrics;
	format: (value: number) => string;
	zeroBased?: boolean;
}[] = [
	{ title: "People", metric: "population", format: formatCount },
	{ title: "Unemployment", metric: "unemploymentPct", format: formatPercent, zeroBased: true },
	{ title: "Council approval", metric: "approvalPct", format: formatPercent },
	{ title: "Average rent", metric: "averageRent", format: formatMoney },
	{ title: "House prices", metric: "housePrice", format: formatMoney },
	{ title: "Homelessness", metric: "homelessPct", format: formatPercent, zeroBased: true },
	{ title: "Inequality (Gini)", metric: "gini", format: (value) => value.toFixed(2) },
	{ title: "Inflation", metric: "inflationPct", format: formatPercent },
];

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
	return (
		<div className="polis-tile">
			<p className="polis-faint">{label}</p>
			<p className="polis-tile-value">{value}</p>
			{hint ? <p className="polis-faint">{hint}</p> : null}
		</div>
	);
}

function ForkControls({ engine, status }: { engine: PolisEngine; status: PolisStatus }) {
	if (status.branches.length < 2) {
		return (
			<div className="polis-fork polis-fork-dashed">
				<p className="polis-small">
					Fork the town to run two futures side by side. Change one, leave the other, and compare.
				</p>
				<Button
					variant="outline"
					size="sm"
					icon="gitFork"
					onClick={() => engine.send({ type: "fork" })}
				>
					Fork the town
				</Button>
			</div>
		);
	}

	return (
		<div className="polis-fork">
			<p className="polis-small-strong">Two futures are running. You are watching:</p>
			<div className="polis-inline">
				{status.branches.map((label, index) => (
					<Button
						key={label}
						variant={status.branch === index ? "primary" : "outline"}
						size="xs"
						onClick={() => engine.send({ type: "branch", index })}
					>
						{label}
					</Button>
				))}
			</div>
			<p className="polis-small">Laws and events apply to the future you are watching.</p>
			<Button
				variant="ghost"
				size="xs"
				icon="merge"
				onClick={() => engine.send({ type: "keepBranch" })}
			>
				Keep this future
			</Button>
		</div>
	);
}

function Moments({ status }: { status: PolisStatus }) {
	if (status.moments.length === 0) {
		return null;
	}

	return (
		<section aria-label="Recent lives" className="polis-stack">
			<h3 className="polis-heading">Around town</h3>
			<ol className="polis-timelist">
				{status.moments.slice(0, 8).map((moment, index) => (
					<li key={`${moment.day}-${moment.hour}-${index}`}>
						<span className="polis-mono">{String(moment.hour).padStart(2, "0")}:00</span>
						<span>
							{moment.name}: {moment.text.toLowerCase()}
						</span>
					</li>
				))}
			</ol>
		</section>
	);
}

function Chronicle({ status }: { status: PolisStatus }) {
	const entries = status.snapshot.chronicle.slice(0, 6);

	if (entries.length === 0) {
		return null;
	}

	return (
		<section aria-label="Town news" className="polis-stack">
			<h3 className="polis-heading">Town news</h3>
			<ol className="polis-timelist">
				{entries.map((entry, index) => (
					<li key={`${entry.day}-${index}`}>
						<span className="polis-mono">Y{yearOf(entry.day)}</span>
						<span>{entry.text}</span>
					</li>
				))}
			</ol>
		</section>
	);
}

export function TownPanel({ engine, status }: { engine: PolisEngine; status: PolisStatus }) {
	const { latest } = status.snapshot;

	return (
		<div className="polis-stack polis-stack-wide">
			{latest ? (
				<div className="polis-tiles">
					<Tile
						label="People"
						value={formatCount(latest.population)}
						hint={`${latest.firms} firms`}
					/>
					<Tile label="Out of work" value={formatPercent(latest.unemploymentPct)} />
					<Tile label="Mood" value={`${latest.mood.toFixed(0)}/100`} />
					<Tile label="Approval" value={formatPercent(latest.approvalPct)} />
					<Tile label="Median savings" value={formatMoney(latest.medianWealth)} />
					<Tile
						label="Protesting"
						value={formatCount(latest.protesters)}
						hint={`${formatCount(latest.homeless)} homeless`}
					/>
				</div>
			) : (
				<p className="polis-small">Figures arrive at the end of the first month.</p>
			)}

			{engine.viewOnly ? null : <ForkControls engine={engine} status={status} />}

			<Chronicle status={status} />
			<Moments status={status} />

			<div className="polis-stack polis-stack-wide">
				<SeriesLegend labels={status.series.map((line) => line.label)} />
				{CHARTS.map(({ title, metric, format, zeroBased }) => (
					<TrendChart
						key={metric}
						title={title}
						format={format}
						zeroBased={zeroBased}
						playhead={status.playback ? status.playback.day / MONTH_DAYS : undefined}
						series={status.series.map((line) => ({
							label: line.label,
							points: line.points.map((point) => ({
								month: point.month,
								value: point[metric],
							})),
						}))}
					/>
				))}
			</div>
		</div>
	);
}
