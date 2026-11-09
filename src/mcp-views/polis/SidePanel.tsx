import { useState } from "react";

import { EventsPanel } from "./panels/EventsPanel";
import { LawsPanel } from "./panels/LawsPanel";
import { MindsPanel } from "./panels/MindsPanel";
import { TownPanel } from "./panels/TownPanel";
import type { PolisEngine } from "./usePolisEngine";

const TABS = [
	{ id: "town", label: "Town" },
	{ id: "laws", label: "Laws" },
	{ id: "events", label: "Events" },
	{ id: "minds", label: "Minds" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SidePanel({ engine }: { engine: PolisEngine }) {
	const [tab, setTab] = useState<TabId>("town");
	const { status } = engine;

	if (!status) {
		return null;
	}

	const watching = status.playback !== null;

	return (
		<aside className="polis-side">
			<div role="tablist" aria-label="Town controls" className="polis-tabs">
				{TABS.filter((item) => !engine.viewOnly || item.id === "town").map((item) => (
					<button
						key={item.id}
						type="button"
						role="tab"
						aria-selected={tab === item.id}
						className="polis-tab"
						onClick={() => setTab(item.id)}
					>
						{item.label}
					</button>
				))}
			</div>
			<div className="polis-side-body">
				{tab === "town" ? <TownPanel engine={engine} status={status} /> : null}
				{watching && (tab === "laws" || tab === "events") ? (
					<p className="polis-small">
						You are watching history. Choose Carry on from here to change it, or Back to now.
					</p>
				) : null}
				{!watching && tab === "laws" ? <LawsPanel engine={engine} status={status} /> : null}
				{!watching && tab === "events" ? <EventsPanel engine={engine} /> : null}
				{tab === "minds" ? <MindsPanel engine={engine} status={status} /> : null}
			</div>
		</aside>
	);
}
