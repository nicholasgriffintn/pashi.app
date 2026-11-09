import type { ReactNode } from "react";

const ICONS = {
	baby: (
		<>
			<circle cx="12" cy="9" r="5" />
			<path d="M9 17c-3 1-4 3-4 4h14c0-1-1-3-4-4" />
			<path d="M10 9h.01M14 9h.01" />
		</>
	),
	biohazard: (
		<>
			<circle cx="12" cy="12" r="2" />
			<path d="M12 10V3M10.3 13l-6 3.5M13.7 13l6 3.5" />
			<path d="M8 4.5a8 8 0 0 0-3 12M19 16.5a8 8 0 0 0-3-12M9 21a8 8 0 0 0 6 0" />
		</>
	),
	check: <path d="M20 6 9 17l-5-5" />,
	chevronLeft: <path d="m15 18-6-6 6-6" />,
	chevronRight: <path d="m9 18 6-6-6-6" />,
	copy: (
		<>
			<rect x="9" y="9" width="12" height="12" />
			<path d="M5 15V3h12" />
		</>
	),
	cornerDownRight: (
		<>
			<path d="m15 10 5 5-5 5" />
			<path d="M4 4v7a4 4 0 0 0 4 4h12" />
		</>
	),
	crosshair: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M22 12h-4M6 12H2M12 6V2M12 22v-4" />
		</>
	),
	dice: (
		<>
			<rect x="3" y="3" width="18" height="18" />
			<path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" />
		</>
	),
	download: (
		<>
			<path d="M12 3v12M7 10l5 5 5-5" />
			<path d="M4 21h16" />
		</>
	),
	factory: <path d="M3 21V10l6 4v-4l6 4V6h4v15z" />,
	fileUp: (
		<>
			<path d="M14 3H6v18h12V7z" />
			<path d="M12 18v-6M9 14l3-3 3 3" />
		</>
	),
	film: (
		<>
			<rect x="3" y="3" width="18" height="18" />
			<path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" />
		</>
	),
	gavel: (
		<>
			<path d="m14 13-8 8-3-3 8-8" />
			<path d="m16 16 6-6M8 8l6-6M7 9l6 6M11 5l8 8" />
		</>
	),
	gitFork: (
		<>
			<circle cx="6" cy="4" r="2" />
			<circle cx="18" cy="4" r="2" />
			<circle cx="12" cy="20" r="2" />
			<path d="M6 6v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V6M12 12v6" />
		</>
	),
	history: (
		<>
			<path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
			<path d="M3 3v5h5M12 7v5l3 2" />
		</>
	),
	home: (
		<>
			<path d="m3 11 9-8 9 8" />
			<path d="M5 10v11h14V10" />
		</>
	),
	landmark: <path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M3 10l9-7 9 7z" />,
	merge: (
		<>
			<circle cx="6" cy="19" r="2" />
			<circle cx="18" cy="12" r="2" />
			<path d="M6 3v14M8 5c4 0 8 3 8 7" />
		</>
	),
	pause: <path d="M8 4v16M16 4v16" />,
	plane: <path d="M2 14 22 4l-7 17-3-7z" />,
	play: <path d="M6 4v16l14-8z" />,
	radio: (
		<>
			<circle cx="12" cy="12" r="2" />
			<path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10" />
		</>
	),
	save: (
		<>
			<path d="M4 3h13l3 3v15H4z" />
			<path d="M8 3v6h8V3M8 21v-7h8v7" />
		</>
	),
	scale: (
		<>
			<path d="M12 3v18M5 21h14M5 7h14" />
			<path d="m5 7-3 8a3 3 0 0 0 6 0zM19 7l-3 8a3 3 0 0 0 6 0z" />
		</>
	),
	share: (
		<>
			<circle cx="18" cy="5" r="3" />
			<circle cx="6" cy="12" r="3" />
			<circle cx="18" cy="19" r="3" />
			<path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
		</>
	),
	shuffle: <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />,
	skip: (
		<>
			<path d="M5 4v16l10-8z" />
			<path d="M19 5v14" />
		</>
	),
	trash: <path d="M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15" />,
	trendingDown: <path d="m22 17-9-9-4 4-7-7M16 17h6v-6" />,
	trendingUp: <path d="m22 7-9 9-4-4-7 7M16 7h6v6" />,
	vote: (
		<>
			<path d="m9 12 2 2 4-4" />
			<path d="M5 7v10h14V7M3 17h18v4H3z" />
		</>
	),
	waves: (
		<path d="M2 8c2.5 2 4.5 2 7 0s4.5-2 7 0 4.5 2 6 .5M2 13c2.5 2 4.5 2 7 0s4.5-2 7 0 4.5 2 6 .5M2 18c2.5 2 4.5 2 7 0s4.5-2 7 0 4.5 2 6 .5" />
	),
	x: <path d="M18 6 6 18M6 6l12 12" />,
	zap: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
	return (
		<svg
			aria-hidden="true"
			className="icon"
			fill="none"
			height={size}
			stroke="currentColor"
			strokeLinecap="square"
			strokeLinejoin="miter"
			strokeWidth={2}
			viewBox="0 0 24 24"
			width={size}
		>
			{ICONS[name]}
		</svg>
	);
}
