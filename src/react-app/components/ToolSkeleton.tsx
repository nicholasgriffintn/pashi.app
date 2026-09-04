interface ToolSkeletonProps {
	label: string;
}

export function ToolSkeleton({ label }: ToolSkeletonProps) {
	return (
		<div
			aria-busy="true"
			aria-label={`Loading ${label.toLowerCase()}`}
			className="generator tool-skeleton"
		>
			<span className="tool-skeleton-label">{label}</span>
			<div className="tool-skeleton-picker" />
			<div className="tool-skeleton-line" style={{ width: "58%" }} />
			<div className="tool-skeleton-fields">
				<div className="tool-skeleton-field" />
				<div className="tool-skeleton-field" />
			</div>
			<div className="tool-skeleton-button" />
		</div>
	);
}
