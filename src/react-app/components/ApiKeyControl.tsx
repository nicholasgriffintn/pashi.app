import { useState } from "react";

import { useApiKey } from "../lib/api-key-context";

export function ApiKeyControl() {
	const { apiKey, setApiKey } = useApiKey();
	const [isRevealed, setIsRevealed] = useState(false);
	const hasApiKey = Boolean(apiKey.trim());

	return (
		<div className="api-key-control" data-configured={hasApiKey}>
			<label htmlFor="pashi-api-key">
				<span>API key</span>
				<input
					autoCapitalize="none"
					autoComplete="off"
					id="pashi-api-key"
					onChange={(event) => setApiKey(event.target.value)}
					placeholder="Required for cloud tools"
					spellCheck={false}
					type={isRevealed ? "text" : "password"}
					value={apiKey}
				/>
			</label>
			<button
				aria-label={isRevealed ? "Hide API key" : "Show API key"}
				disabled={!apiKey}
				onClick={() => setIsRevealed((current) => !current)}
				title={isRevealed ? "Hide API key" : "Show API key"}
				type="button"
			>
				<span aria-hidden="true">{isRevealed ? "×" : "◉"}</span>
			</button>
			{hasApiKey ? (
				<button
					aria-label="Clear API key"
					onClick={() => {
						setApiKey("");
						setIsRevealed(false);
					}}
					title="Clear API key"
					type="button"
				>
					<span aria-hidden="true">⌫</span>
				</button>
			) : null}
		</div>
	);
}
