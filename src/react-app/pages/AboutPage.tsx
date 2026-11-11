import { Link } from "react-router-dom";

import { useStaticPageMetadata } from "../lib/use-document-metadata";

export function AboutPage() {
	useStaticPageMetadata("/about");

	return (
		<main className="page">
			<h1>About</h1>
			<p className="page-lede">
				Pashi takes its name from the manga SFX <em>pashi</em>: a crisp smack or click of impact.
			</p>
			<p>
				When I first started Pashi i was looking to build an app that provided generators and
				convertors for my other services (such as my ai platform) to use over an api. Since then
				i've decided to make more out of this application.
			</p>
			<p>Today, Pashi is the place where I experiment and build new side projects from.</p>
			<p>
				The tools console covers the formats I reach for most. Labs is where AI experiments live
				before they earn a permanent home. Anything large enough to need its own deploy gets a
				subdomain and a card on the front page.
			</p>
			<h2>How it runs</h2>
			<p>
				Pashi runs off the Cloudflare's workers platform, this includes the entire api and React
				application. Alongside this, we are also using Polychat for AI and Cloudflare Containers For
				some of the convertors.
			</p>
			<p>
				The entire tool catalogue is published at <Link to="/api">the API</Link> so other programs
				can use it.
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
