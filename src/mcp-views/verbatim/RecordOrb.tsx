export function RecordOrb({
	level,
	listening,
	onToggle,
	starting,
}: {
	level: number;
	listening: boolean;
	onToggle: () => void;
	starting: boolean;
}) {
	const ring = listening ? 1 + Math.min(1, level * 2.5) * 0.45 : 1;

	return (
		<button
			type="button"
			className={`record-orb ${listening ? "record-orb-live" : ""}`}
			onClick={onToggle}
			disabled={starting}
			aria-pressed={listening}
			aria-label={listening ? "Stop listening" : "Start listening"}
		>
			<span className="record-orb-ring" style={{ transform: `scale(${ring})` }} />
			<span className="record-orb-core">
				{listening ? (
					<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
						<rect x="5" y="5" width="14" height="14" fill="currentColor" />
					</svg>
				) : (
					<svg
						viewBox="0 0 24 24"
						width="22"
						height="22"
						aria-hidden="true"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<rect x="9" y="2" width="6" height="12" rx="3" />
						<path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3" />
					</svg>
				)}
			</span>
		</button>
	);
}
