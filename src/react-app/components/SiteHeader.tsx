import { Link, NavLink } from "react-router-dom";

import { PaletteButton } from "./PaletteButton";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
	{ label: "Tools", to: "/tools" },
	{ label: "Labs", to: "/labs" },
	{ label: "API", to: "/api" },
	{ label: "About", to: "/about" },
];

export function SiteHeader() {
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
				</div>
			</div>
		</header>
	);
}
