import { Link } from "react-router-dom";

import { ApiKeyControl } from "../components/ApiKeyControl";
import { PolychatConnect } from "../components/PolychatConnect";
import { useApiKey } from "../lib/api-key-context";
import { useStaticPageMetadata } from "../lib/use-document-metadata";

const DEV_KEY = import.meta.env.VITE_PASHI_DEV_API_KEY;

export function SignInPage() {
	const { apiKey, setApiKey } = useApiKey();

	useStaticPageMetadata("/sign-in");

	return (
		<main className="page sign-in">
			<h1>Sign in</h1>
			<p className="page-lede">
				Connect Polychat for the AI labs. Polychat Pro also unlocks media and document conversion.
			</p>

			<section className="sign-in-panel">
				<PolychatConnect />
			</section>

			<section className="sign-in-panel">
				<ApiKeyControl hint="For media conversion without Polychat Pro. Stored in this browser only." />
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
