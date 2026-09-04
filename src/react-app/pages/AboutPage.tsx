import { Link } from "react-router-dom";

import { useDocumentMetadata } from "../lib/use-document-metadata";

export function AboutPage() {
	useDocumentMetadata("About", "What Pashi is, and how it runs on Cloudflare.");

	return (
		<main className="page">
			<h1>About</h1>
			<p className="page-lede">
				Pashi takes its name from the manga SFX <em>pashi</em>: a crisp smack or click of impact.
			</p>
			<p>
				It started as a set of tiny generators and grew into the place I put side projects. The
				tools console covers the formats I reach for most. Labs is where AI experiments live before
				they earn a permanent home. Anything large enough to need its own deploy gets a subdomain
				and a card on the front page.
			</p>
			<h2>How it runs</h2>
			<p>
				One Cloudflare Worker serves the API and the single page app. Text conversions run in the
				Worker itself. Media and document conversions run in a container behind a queue, with
				results held in object storage for a day. Everything is rate limited, and the whole tool
				catalogue is published at <Link to="/api">the API</Link> so other programs can use it.
			</p>
			<p>
				Source lives on{" "}
				<a href="https://github.com/nicholasgriffintn/pashi.app" rel="noreferrer" target="_blank">
					GitHub
				</a>
				.
			</p>
		</main>
	);
}
