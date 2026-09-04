import { Link } from "react-router-dom";

import { ApiKeyControl } from "../components/ApiKeyControl";
import { useApiKey } from "../lib/api-key-context";
import { useDocumentMetadata } from "../lib/use-document-metadata";

const DEV_KEY = import.meta.env.VITE_PASHI_DEV_API_KEY;

export function SignInPage() {
	const { apiKey, setApiKey } = useApiKey();
	const isSignedIn = Boolean(apiKey.trim());

	useDocumentMetadata("Sign in", "Set the API key that unlocks media conversion and the AI labs.");

	return (
		<main className="page sign-in">
			<h1>Sign in</h1>
			<p className="page-lede">
				{isSignedIn
					? "You are signed in. The key is used on every page until you clear it."
					: "Paste an application key. It unlocks media and document conversion and the AI labs, and stays on this device."}
			</p>

			<section className="sign-in-panel">
				<ApiKeyControl hint="Stored in this browser only. Clear it to sign out." />
				{import.meta.env.DEV && DEV_KEY ? (
					<button
						className="sign-in-dev"
						disabled={apiKey === DEV_KEY}
						onClick={() => setApiKey(DEV_KEY)}
						type="button"
					>
						{apiKey === DEV_KEY ? "Using the local dev key" : "Use the local dev key"}
					</button>
				) : null}
			</section>

			<p>
				<Link className="card-action" to="/tools">
					Back to the tools <span aria-hidden="true">→</span>
				</Link>
			</p>
		</main>
	);
}
