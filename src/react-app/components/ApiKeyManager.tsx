import { useId, useState, type FormEvent } from "react";

import { useApiKey } from "../lib/api-key-context";
import { useApiKeys } from "../lib/use-api-keys";
import { usePolychatSession } from "../lib/use-polychat-session";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export function ApiKeyManager() {
	const session = usePolychatSession();
	const isConnected = session.status === "connected";
	const { create, list, revoke } = useApiKeys(isConnected);
	const { apiKey, setApiKey } = useApiKey();
	const [name, setName] = useState("");
	const [copied, setCopied] = useState(false);
	const nameId = useId();
	const keys = list.data?.keys ?? [];
	const limit = list.data?.limit ?? 0;
	const created = create.data;

	if (!isConnected) {
		return (
			<div className="api-key-field">
				<div className="api-key-field-head">
					<span className="polychat-connect-title">Your API keys</span>
				</div>
				<p className="api-key-field-hint">
					Connect Polychat above to create free API keys for scripts and MCP clients.
				</p>
			</div>
		);
	}

	function handleCreate(event: FormEvent) {
		event.preventDefault();
		setCopied(false);
		create.mutate(name, { onSuccess: () => setName("") });
	}

	async function copyCreatedKey(key: string) {
		try {
			await navigator.clipboard.writeText(key);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	}

	return (
		<div className="api-key-field api-key-manager" data-configured={keys.length > 0 || undefined}>
			<div className="api-key-field-head">
				<span className="polychat-connect-title">Your API keys</span>
				<span className="api-key-field-status">
					{list.isPending ? "Loading" : `${keys.length} of ${limit}`}
				</span>
			</div>
			<p className="api-key-field-hint">
				Free keys give scripts and MCP clients their own rate limit and saved patterns and towns.
				Media conversion and the AI media tools still need Polychat Pro.
			</p>

			{created ? (
				<div className="api-key-created" role="status">
					<p className="api-key-field-hint">
						Copy this key now. Pashi stores only a fingerprint and cannot show it again.
					</p>
					<code className="api-key-created-value">{created.key}</code>
					<div className="api-key-field-row api-key-created-actions">
						<button onClick={() => void copyCreatedKey(created.key)} type="button">
							{copied ? "Copied" : "Copy"}
						</button>
						<button
							disabled={apiKey === created.key}
							onClick={() => setApiKey(created.key)}
							type="button"
						>
							{apiKey === created.key ? "In use here" : "Use in this browser"}
						</button>
					</div>
				</div>
			) : null}

			{keys.length > 0 ? (
				<ul className="api-key-list">
					{keys.map((key) => (
						<li key={key.id}>
							<span className="api-key-list-name">{key.name}</span>
							<span className="api-key-list-meta">
								ends {key.hint} · created {DATE_FORMAT.format(new Date(key.createdAt))}
							</span>
							<button
								className="polychat-connect-action"
								disabled={revoke.isPending}
								onClick={() => revoke.mutate(key.id)}
								type="button"
							>
								Revoke
							</button>
						</li>
					))}
				</ul>
			) : null}

			{keys.length < limit ? (
				<form className="api-key-field-row api-key-create" onSubmit={handleCreate}>
					<label className="sr-only" htmlFor={nameId}>
						Key name
					</label>
					<input
						id={nameId}
						maxLength={60}
						onChange={(event) => setName(event.target.value)}
						placeholder="Name, such as laptop script"
						value={name}
					/>
					<button disabled={create.isPending} type="submit">
						{create.isPending ? "Creating" : "Create key"}
					</button>
				</form>
			) : null}

			{create.error ? <p role="alert">{create.error.message}</p> : null}
			{revoke.error ? <p role="alert">{revoke.error.message}</p> : null}
			{list.error ? <p role="alert">{list.error.message}</p> : null}
		</div>
	);
}
