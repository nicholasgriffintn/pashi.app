import type { ToolExample } from "../../shared/tool-examples";

interface ToolExamplesProps {
	examples: readonly ToolExample[];
	label: string;
	onApply: (example: ToolExample) => void;
}

export function ToolExamples({ examples, label, onApply }: ToolExamplesProps) {
	if (examples.length === 0) {
		return null;
	}

	return (
		<div className="examples" aria-label="Examples">
			<span>{label}</span>
			{examples.map((example) => (
				<button key={example.label} onClick={() => onApply(example)} type="button">
					{example.label}
				</button>
			))}
		</div>
	);
}
