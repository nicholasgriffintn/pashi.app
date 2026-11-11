import { Link } from "react-router-dom";

import { useStaticPageMetadata } from "../lib/use-document-metadata";

export function PrivacyPage() {
	useStaticPageMetadata("/privacy");

	return (
		<main className="page">
			<h1>Privacy</h1>
			<p className="page-lede">
				This page describes what Pashi stores, records and sends to other services. Last updated 11
				November 2026.
			</p>
			<h2>Using Pashi without an account</h2>
			<p>
				The generators and text converters work without signing in. Pashi has no accounts of its
				own: AI features and the MCP apps use a Polychat connection or a Pashi API key.
			</p>
			<h2>What Pashi stores on its servers</h2>
			<ul>
				<li>
					<strong>Polychat connection.</strong> When you connect Polychat, Pashi keeps your Polychat
					API key and a link token in Cloudflare KV, sealed with AES-GCM. A browser session lasts 30
					days and is held in an HttpOnly cookie. Pashi also sets a short-lived cookie while you
					sign in.
				</li>
				<li>
					<strong>Saved Strudel patterns and Polis towns.</strong> Saved from the MCP apps, stored
					in KV under a hash of your account, and kept until you delete them.
				</li>
				<li>
					<strong>Twenty Questions games.</strong> A game, including its secret, is stored in KV and
					expires after 24 hours.
				</li>
				<li>
					<strong>API keys.</strong> Pashi stores a SHA-256 digest of each issued API key, not the
					key itself.
				</li>
				<li>
					<strong>File conversions.</strong> Uploaded files and converted outputs are stored in
					Cloudflare R2 so the conversion can run in the background. Jobs expire after 24 hours, and
					the uploaded file is deleted once the conversion succeeds.
				</li>
			</ul>
			<h2>What stays in your browser</h2>
			<p>
				Favourites, recent tools, the last tool you used, your theme and, if you enter one, your
				Pashi API key are kept in local storage. Result history is kept in IndexedDB. None of it is
				sent to Pashi for storage. Clear your browser data to remove it.
			</p>
			<h2>Analytics</h2>
			<p>
				Pashi records usage events in Cloudflare Analytics Engine: the event name, tool id and type,
				whether it succeeded and how long it took. Events carry no user, account, API key or IP
				address field, and no tool input or output.
			</p>
			<h2>Rate limiting</h2>
			<p>
				Requests are rate limited by IP address, or by application when an API key is used, through
				Cloudflare's rate limiting binding.
			</p>
			<h2>Who receives your data</h2>
			<ul>
				<li>
					<strong>Polychat.</strong> When you connect it, Pashi sends your Polychat API key with AI
					completion and decision requests, and with the text, images, video or audio those requests
					concern. Polychat's own policy governs what it does next.
				</li>
				<li>
					<strong>Cloudflare.</strong> Pashi runs on Cloudflare Workers, KV, R2, Queues and
					Containers. Cloudflare Workers AI transcribes Verbatim audio, converts documents to
					Markdown and writes AI output when Polychat is not connected.
				</li>
			</ul>
			<h2>Camera, microphone and photos</h2>
			<p>
				Charades sends a recorded clip, Photo Sorter sends a photo and Verbatim sends recorded audio
				to be judged or transcribed. Pashi does not write clips, photos or audio to KV or R2. They
				are forwarded to Polychat or Workers AI for that request only.
			</p>
			<h2>Shared Polis towns</h2>
			<p>
				A shared town is readable by anyone with its link until the owner stops sharing it. Stopping
				removes the public copy.
			</p>
			<h2>Disconnecting and deleting</h2>
			<ul>
				<li>
					Use Disconnect on the <Link to="/sign-in">sign-in page</Link>. Pashi removes its link at
					Polychat and deletes the stored connection and session.
				</li>
				<li>
					Delete saved Strudel patterns and Polis towns from within the apps. Twenty Questions games
					and conversion jobs expire on their own.
				</li>
				<li>Clear your browser data to remove favourites, history and a stored API key.</li>
			</ul>
			<h2>Contact</h2>
			<p>
				Raise questions or requests on{" "}
				<a
					href="https://github.com/nicholasgriffintn/pashi.app/issues"
					rel="noreferrer"
					target="_blank"
				>
					GitHub
				</a>
				.
			</p>
		</main>
	);
}
