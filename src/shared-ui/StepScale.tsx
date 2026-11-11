export function StepScale({
	active,
	label,
	steps,
}: {
	active: number;
	label: string;
	steps: readonly string[];
}) {
	return (
		<div className="step-scale">
			<div className="step-scale-head">
				<span className="step-scale-label">{label}</span>
				<span className="step-scale-value">{steps[active] ?? ""}</span>
			</div>
			<div className="step-scale-track" aria-hidden="true">
				{steps.map((step, index) => (
					<span
						key={step}
						className={`step ${index === active ? "step-active" : index < active ? "step-past" : ""}`}
					/>
				))}
			</div>
		</div>
	);
}
