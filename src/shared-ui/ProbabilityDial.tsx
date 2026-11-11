import { formatProbabilityPercent, probabilityTone } from "./probability";

const TICKS = Array.from({ length: 11 }, (_, index) => index / 10);

function polar(fraction: number, radius: number) {
	const angle = Math.PI * (1 - fraction);

	return { x: 50 + radius * Math.cos(angle), y: 50 - radius * Math.sin(angle) };
}

export function ProbabilityDial({
	label,
	probability,
	size = "md",
}: {
	label?: string;
	probability: number | null;
	size?: "md" | "sm";
}) {
	const value = probability ?? 0.5;
	const start = polar(0, 40);
	const end = polar(1, 40);
	const filled = polar(value, 40);
	const tone = probability === null ? null : probabilityTone(value);
	const stroke = size === "sm" ? 7 : 5;

	return (
		<figure className={`dial dial-${size}`}>
			<svg viewBox="0 0 100 58" aria-hidden="true">
				<path
					className="dial-track"
					d={`M ${start.x} ${start.y} A 40 40 0 0 1 ${end.x} ${end.y}`}
					strokeWidth={stroke}
				/>
				{probability === null ? null : (
					<path
						className={`dial-fill dial-${tone}`}
						d={`M ${start.x} ${start.y} A 40 40 0 0 1 ${filled.x} ${filled.y}`}
						strokeWidth={stroke}
					/>
				)}
				{size === "sm"
					? null
					: TICKS.map((tick) => {
							const outer = polar(tick, 47);
							const inner = polar(tick, tick === 0.5 ? 43 : 45);

							return (
								<line
									key={tick}
									className="dial-tick"
									x1={inner.x}
									x2={outer.x}
									y1={inner.y}
									y2={outer.y}
								/>
							);
						})}
				<g className="dial-needle" style={{ transform: `rotate(${value * 180 - 90}deg)` }}>
					<line x1={50} x2={50} y1={50} y2={size === "sm" ? 18 : 14} />
				</g>
				<circle className="dial-hub" cx={50} cy={50} r={2.6} />
			</svg>
			<figcaption>
				<span className={`dial-value ${tone ? `dial-text-${tone}` : ""}`}>
					{probability === null ? "··" : formatProbabilityPercent(probability)}
				</span>
				{label ? <span className="dial-label">{label}</span> : null}
			</figcaption>
		</figure>
	);
}
