import { Link } from "react-router-dom";

export function SiteFooter() {
	return (
		<footer className="site-footer">
			<div className="site-footer-inner">
				<p className="site-footer-note">Pashi. Named for the manga SFX: a crisp smack of impact.</p>
				<nav aria-label="Footer" className="site-footer-links">
					<Link to="/api">API</Link>
					<Link to="/about">About</Link>
					<a href="https://github.com/nicholasgriffintn/pashi.app" rel="noreferrer" target="_blank">
						Source
					</a>
				</nav>
			</div>
		</footer>
	);
}
