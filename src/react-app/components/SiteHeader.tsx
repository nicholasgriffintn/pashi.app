import { Link, NavLink } from "react-router-dom";

import { useApiKey } from "../lib/api-key-context";
import { usePolychatSession } from "../lib/use-polychat-session";
import { PaletteButton } from "./PaletteButton";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
	{ label: "Tools", to: "/tools" },
	{ label: "Labs", to: "/labs" },
	{ label: "API", to: "/api" },
	{ label: "About", to: "/about" },
];

export function SiteHeader() {
	const { apiKey } = useApiKey();
	const session = usePolychatSession();
	const isSignedIn = Boolean(apiKey.trim()) || session.status === "connected";

	return (
		<header className="site-header">
			<div className="site-header-inner">
				<Link aria-label="Pashi home" className="site-brand" to="/">
					<img alt="" aria-hidden="true" src="/logo-v2-stylised.svg" />
					<span>Pashi</span>
				</Link>
				<nav aria-label="Site" className="site-nav">
					{NAV_ITEMS.map((item) => (
						<NavLink
							className={({ isActive }) => (isActive ? "is-active" : undefined)}
							key={item.to}
							to={item.to}
						>
							{item.label}
						</NavLink>
					))}
				</nav>
				<div className="site-actions">
					<PaletteButton />
					<ThemeToggle />
					<Link className="site-sign-in" data-signed-in={isSignedIn || undefined} to="/sign-in">
						<span className="site-sign-in-dot" aria-hidden="true" />
						{isSignedIn ? "Signed in" : "Sign in"}
					</Link>
				</div>
			</div>
		</header>
	);
}
