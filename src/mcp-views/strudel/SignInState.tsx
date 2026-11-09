import { host } from "../shared/host";

const LINK_ERROR = /polychat/i;

export function needsPolychatSignIn(message: string | null) {
	return Boolean(message && LINK_ERROR.test(message));
}

export function SignInState({ siteUrl }: { siteUrl: string }) {
	return (
		<section className="empty-state">
			<h2 className="card-title">Sign in to save patterns</h2>
			<p className="card-description">
				Connect Pashi to your Polychat account to generate, save and update patterns.
			</p>
			<button
				type="button"
				className="button button-primary"
				onClick={() => void host.openLink(`${siteUrl}/sign-in`)}
			>
				Open Pashi sign-in
			</button>
		</section>
	);
}
