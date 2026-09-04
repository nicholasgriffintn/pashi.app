interface QuickPickTool {
	id: string;
	label: string;
}

interface QuickPicksProps {
	onPick: (toolId: string) => void;
	preferredIds: readonly string[];
	tools: readonly QuickPickTool[];
}

export function QuickPicks({ onPick, preferredIds, tools }: QuickPicksProps) {
	const picks = preferredIds
		.map((id) => tools.find((tool) => tool.id === id))
		.filter((tool): tool is QuickPickTool => Boolean(tool));

	if (picks.length === 0) {
		return null;
	}

	return (
		<div className="quick-picks">
			<span className="quick-picks-label">Or jump straight to</span>
			<ul>
				{picks.map((tool) => (
					<li key={tool.id}>
						<button onClick={() => onPick(tool.id)} type="button">
							{tool.label}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
