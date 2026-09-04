import { useId, useState } from "react";

import { useApiKey } from "../lib/api-key-context";

interface ApiKeyControlProps {
	hint?: string;
}

export function ApiKeyControl({
	hint = "Needed for media conversion and the AI labs. Kept in this tab only.",
}: ApiKeyControlProps) {
	const { apiKey, setApiKey } = useApiKey();
	const [isRevealed, setIsRevealed] = useState(false);
	const inputId = useId();
	const hasApiKey = Boolean(apiKey.trim());

	return (
		<div className="api-key-field" data-configured={hasApiKey || undefined}>
			<div className="api-key-field-head">
				<label htmlFor={inputId}>API key</label>
				<span className="api-key-field-status">{hasApiKey ? "Set" : "Not set"}</span>
			</div>
			<div className="api-key-field-row">
				<input
					autoCapitalize="none"
					autoComplete="off"
					id={inputId}
					onChange={(event) => setApiKey(event.target.value)}
					placeholder="Paste your key"
					spellCheck={false}
					type={isRevealed ? "text" : "password"}
					value={apiKey}
				/>
				<button
					disabled={!apiKey}
					onClick={() => setIsRevealed((current) => !current)}
					type="button"
				>
					{isRevealed ? "Hide" : "Show"}
				</button>
				<button
					disabled={!hasApiKey}
					onClick={() => {
						setApiKey("");
						setIsRevealed(false);
					}}
					type="button"
				>
					Clear
				</button>
			</div>
			<p className="api-key-field-hint">{hint}</p>
		</div>
	);
}
