export function Readout({ label, value }: { label: string; value: string }) {
	return (
		<div className="readout">
			<div className="readout-value">{value}</div>
			<div className="readout-label">{label}</div>
		</div>
	);
}
