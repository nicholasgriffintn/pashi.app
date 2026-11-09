export function OpeningCard({
	message = "Replaying everything that happened, exactly as it did.",
	progress,
	title,
}: {
	message?: string;
	progress: number;
	title: string;
}) {
	return (
		<div className="polis-cover">
			<div className="polis-card">
				<p className="polis-card-title">{title}</p>
				<p className="muted">{message}</p>
				<div className="polis-meter">
					<div className="polis-meter-fill" style={{ width: `${progress * 100}%` }} />
				</div>
			</div>
		</div>
	);
}
