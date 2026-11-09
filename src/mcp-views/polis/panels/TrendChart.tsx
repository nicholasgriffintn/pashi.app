import { useState, type PointerEvent } from "react";

export interface TrendSeries {
	label: string;
	points: { month: number; value: number }[];
}

const WIDTH = 320;
const HEIGHT = 96;
const PAD_LEFT = 38;
const PAD_RIGHT = 6;
const PAD_TOP = 6;
const PAD_BOTTOM = 16;
const SERIES_CLASSES = ["polis-series-0", "polis-series-1"];

function yearLabel(month: number): string {
	return `Y${Math.floor(month / 12) + 1}`;
}

export function TrendChart({
	title,
	series,
	format,
	zeroBased = false,
	playhead,
}: {
	title: string;
	series: TrendSeries[];
	format: (value: number) => string;
	zeroBased?: boolean;
	playhead?: number;
}) {
	const [hoverMonth, setHoverMonth] = useState<number | null>(null);
	const all = series.flatMap((line) => line.points);

	if (all.length < 2) {
		return (
			<figure className="polis-chart">
				<figcaption className="polis-chart-title">{title}</figcaption>
				<p className="polis-chart-empty">Gathering a few months…</p>
			</figure>
		);
	}

	const months = all.map((point) => point.month);
	const values = all.map((point) => point.value);
	const firstMonth = Math.min(...months);
	const lastMonth = Math.max(...months);
	const rawLow = zeroBased ? 0 : Math.min(...values);
	const rawHigh = Math.max(...values);
	const margin = rawHigh === rawLow ? Math.max(Math.abs(rawHigh) * 0.1, 1) : 0;
	const low = rawLow - margin;
	const high = rawHigh + margin;
	const x = (month: number) =>
		PAD_LEFT +
		((month - firstMonth) / Math.max(lastMonth - firstMonth, 1)) * (WIDTH - PAD_LEFT - PAD_RIGHT);
	const y = (value: number) =>
		PAD_TOP + (1 - (value - low) / (high - low)) * (HEIGHT - PAD_TOP - PAD_BOTTOM);

	const onMove = (event: PointerEvent<SVGSVGElement>) => {
		const bounds = event.currentTarget.getBoundingClientRect();
		const position = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
		const fraction = (position - PAD_LEFT) / (WIDTH - PAD_LEFT - PAD_RIGHT);

		setHoverMonth(
			Math.min(lastMonth, Math.max(firstMonth, firstMonth + fraction * (lastMonth - firstMonth))),
		);
	};

	const readings =
		hoverMonth === null
			? null
			: series.map((line) => {
					const nearest = line.points.reduce((best, point) =>
						Math.abs(point.month - hoverMonth) < Math.abs(best.month - hoverMonth) ? point : best,
					);

					return { label: line.label, point: nearest };
				});
	const latest = series.map((line) => line.points[line.points.length - 1]);
	const playheadX =
		playhead === undefined ? null : x(Math.min(lastMonth, Math.max(firstMonth, playhead)));

	return (
		<figure className="polis-chart">
			<figcaption className="polis-chart-head">
				<span className="polis-chart-title">{title}</span>
				<span className="polis-mono">
					{readings
						? `${yearLabel(readings[0].point.month)} · ${readings
								.map((reading) => format(reading.point.value))
								.join(" / ")}`
						: latest.map((point) => (point ? format(point.value) : "")).join(" / ")}
				</span>
			</figcaption>
			<svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				role="img"
				aria-label={`${title}, latest ${latest.map((point) => (point ? format(point.value) : "")).join(" and ")}`}
				className="polis-chart-svg"
				onPointerMove={onMove}
				onPointerLeave={() => setHoverMonth(null)}
			>
				<line
					x1={PAD_LEFT}
					x2={WIDTH - PAD_RIGHT}
					y1={y(low)}
					y2={y(low)}
					className="polis-axis"
					strokeWidth={1}
				/>
				<line
					x1={PAD_LEFT}
					x2={WIDTH - PAD_RIGHT}
					y1={y(high)}
					y2={y(high)}
					className="polis-axis polis-axis-soft"
					strokeWidth={1}
				/>
				<text x={PAD_LEFT - 4} y={y(high) + 3} textAnchor="end" className="polis-axis-label">
					{format(high)}
				</text>
				<text x={PAD_LEFT - 4} y={y(low)} textAnchor="end" className="polis-axis-label">
					{format(low)}
				</text>
				<text x={PAD_LEFT} y={HEIGHT - 3} className="polis-axis-label">
					{yearLabel(firstMonth)}
				</text>
				<text x={WIDTH - PAD_RIGHT} y={HEIGHT - 3} textAnchor="end" className="polis-axis-label">
					{yearLabel(lastMonth)}
				</text>
				{series.map((line, index) => (
					<polyline
						key={line.label}
						fill="none"
						strokeWidth={2}
						strokeLinejoin="round"
						strokeLinecap="round"
						className={SERIES_CLASSES[index]}
						points={line.points.map((point) => `${x(point.month)},${y(point.value)}`).join(" ")}
					/>
				))}
				{playheadX === null ? null : (
					<line
						x1={playheadX}
						x2={playheadX}
						y1={PAD_TOP}
						y2={HEIGHT - PAD_BOTTOM}
						className="polis-playhead"
						strokeWidth={1.5}
					/>
				)}
				{hoverMonth === null ? null : (
					<line
						x1={x(hoverMonth)}
						x2={x(hoverMonth)}
						y1={PAD_TOP}
						y2={HEIGHT - PAD_BOTTOM}
						className="polis-hoverline"
						strokeWidth={1}
					/>
				)}
			</svg>
		</figure>
	);
}

export function SeriesLegend({ labels }: { labels: string[] }) {
	if (labels.length < 2) {
		return null;
	}

	return (
		<div className="polis-legend">
			{labels.map((label, index) => (
				<span key={label} className="polis-legend-item">
					<span aria-hidden="true" className={`polis-swatch ${SERIES_CLASSES[index]}`} />
					<span>{label}</span>
				</span>
			))}
		</div>
	);
}
