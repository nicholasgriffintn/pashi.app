import { formatCompactCount } from "../../shared/numbers";
import { Button } from "../Button";
import { yearOf } from "../format";
import type { PolisEngine } from "../usePolisEngine";

export function CitizenCard({ engine }: { engine: PolisEngine }) {
	const citizen = engine.status?.citizen;

	if (!citizen) {
		return (
			<div className="polis-citizen-slot">
				<Button
					variant="secondary"
					size="sm"
					icon="shuffle"
					onClick={() => engine.send({ type: "followRandom" })}
				>
					Follow someone
				</Button>
			</div>
		);
	}

	return (
		<div className="polis-citizen-slot polis-citizen">
			<div className="polis-row">
				<div>
					<p className="polis-card-title">{citizen.name}</p>
					<p className="polis-small">
						{citizen.age}, wants {citizen.aspiration}
					</p>
				</div>
				<div className="polis-inline">
					<Button
						variant="ghost"
						size="icon"
						icon="crosshair"
						aria-label="Find them on the map"
						onClick={() => engine.send({ type: "focusFollowed" })}
					/>
					<Button
						variant="ghost"
						size="icon"
						icon="x"
						aria-label="Stop following"
						onClick={() => engine.send({ type: "follow", person: -1 })}
					/>
				</div>
			</div>
			<dl className="polis-facts">
				<dt>Work</dt>
				<dd>{citizen.occupation}</dd>
				<dt>Home</dt>
				<dd>{citizen.home}</dd>
				<dt>Pay</dt>
				<dd className="polis-mono">
					{citizen.wage > 0 ? `£${citizen.wage.toLocaleString("en-GB")} a month` : "None"}
				</dd>
				<dt>Savings</dt>
				<dd className="polis-mono">£{formatCompactCount(Math.round(citizen.wealth))}</dd>
				{citizen.mortgage > 0 ? (
					<>
						<dt>Mortgage</dt>
						<dd className="polis-mono">£{formatCompactCount(Math.round(citizen.mortgage))}</dd>
					</>
				) : null}
				<dt>Mood</dt>
				<dd className="polis-mono">{citizen.mood}/100</dd>
				<dt>Family</dt>
				<dd>
					{citizen.partner ? `With ${citizen.partner}` : "Single"}
					{citizen.children > 0 ? `, ${citizen.children} at home` : ""}
				</dd>
			</dl>
			{citizen.life.length > 0 ? (
				<ol className="polis-timelist polis-timelist-ruled">
					{citizen.life.slice(0, 8).map((entry, index) => (
						<li key={`${entry.day}-${index}`}>
							<span className="polis-mono">Y{yearOf(entry.day)}</span>
							<span>{entry.text}</span>
						</li>
					))}
				</ol>
			) : null}
		</div>
	);
}
