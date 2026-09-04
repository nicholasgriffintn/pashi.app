import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { listFavourites, toggleFavourite } from "../lib/favourites";
import { onOpenCommandPalette } from "../lib/palette-events";
import { PROJECTS } from "../lib/projects";
import { jsonQueryOptions } from "../lib/query-client";
import { normaliseSearchText } from "../lib/tool-search";
import { useFocusTrap } from "../lib/use-focus-trap";
import { useTheme } from "../lib/use-theme";

interface PaletteTool {
	aliases: string[];
	description: string;
	display: { category: string };
	id: string;
	label: string;
	toolType: "converter" | "generator";
}

interface PaletteInfo {
	tools: PaletteTool[];
}

interface Command {
	group: string;
	hint?: string;
	id: string;
	label: string;
	run: () => void;
	search: string;
}

export function CommandPalette() {
	const navigate = useNavigate();
	const { toggleTheme } = useTheme();
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const [favourites, setFavourites] = useState(listFavourites);
	const dialogRef = useRef<HTMLDivElement | null>(null);
	const listRef = useRef<HTMLDivElement | null>(null);

	const { data } = useQuery({ ...jsonQueryOptions<PaletteInfo>("/api/info"), enabled: isOpen });

	useFocusTrap(dialogRef, isOpen);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setIsOpen((current) => !current);
				setQuery("");
				setActiveIndex(0);

				return;
			}

			if (event.key === "Escape" && isOpen) {
				setIsOpen(false);
			}
		}

		const stopListening = onOpenCommandPalette(() => {
			setIsOpen(true);
			setQuery("");
			setActiveIndex(0);
		});

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			stopListening();
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	const commands = useMemo<Command[]>(() => {
		const close = () => setIsOpen(false);
		const go = (path: string) => () => {
			close();
			void navigate(path);
		};

		const favouriteIds = new Set(favourites.map((entry) => entry.toolId));
		const tools = data?.tools ?? [];

		const favouriteCommands = tools
			.filter((tool) => favouriteIds.has(tool.id))
			.map((tool) => ({
				group: "Favourites",
				id: `favourite-${tool.id}`,
				label: tool.label,
				run: go(tool.toolType === "converter" ? `/tools/convert/${tool.id}` : `/tools/${tool.id}`),
				search: `${tool.id} ${tool.label} ${tool.description}`,
			}));

		const placeCommands: Command[] = [
			{ group: "Go", id: "go-hub", label: "Hub", run: go("/"), search: "hub home projects" },
			{
				group: "Go",
				id: "go-tools",
				label: "Tools",
				run: go("/tools"),
				search: "tools generators",
			},
			{
				group: "Go",
				id: "go-labs",
				label: "Labs",
				run: go("/labs"),
				search: "labs ai experiments",
			},
			{
				group: "Go",
				id: "go-ask",
				label: "Ask Pashi",
				run: go("/labs/ask"),
				search: "ask natural language route",
			},
			{
				group: "Go",
				id: "go-explain",
				label: "Explainers",
				run: go("/labs/explain"),
				search: "explain regex cron jwt curl sql",
			},
			{ group: "Go", id: "go-api", label: "API", run: go("/api"), search: "api docs endpoints" },
			{ group: "Go", id: "go-about", label: "About", run: go("/about"), search: "about" },
		];

		const projectCommands = PROJECTS.filter((project) => project.external).map((project) => ({
			group: "Projects",
			hint: "External",
			id: `project-${project.id}`,
			label: project.name,
			run: () => {
				close();
				window.open(project.url, "_blank", "noreferrer");
			},
			search: `${project.name} ${project.blurb}`,
		}));

		const actionCommands: Command[] = [
			{
				group: "Actions",
				id: "action-theme",
				label: "Switch theme",
				run: () => {
					close();
					toggleTheme();
				},
				search: "theme dark light appearance",
			},
		];

		const toolCommands = tools.map((tool) => ({
			group: tool.toolType === "converter" ? "Converters" : "Generators",
			hint: tool.display.category,
			id: `tool-${tool.toolType}-${tool.id}`,
			label: tool.label,
			run: go(tool.toolType === "converter" ? `/tools/convert/${tool.id}` : `/tools/${tool.id}`),
			search: `${tool.id} ${tool.label} ${tool.description} ${tool.aliases.join(" ")}`,
		}));

		return [
			...favouriteCommands,
			...placeCommands,
			...projectCommands,
			...actionCommands,
			...toolCommands,
		];
	}, [data, favourites, navigate, toggleTheme]);

	const matches = useMemo(() => {
		const tokens = normaliseSearchText(query).split(" ").filter(Boolean);

		if (tokens.length === 0) {
			return commands.slice(0, 40);
		}

		return commands
			.filter((command) => {
				const haystack = normaliseSearchText(`${command.label} ${command.search}`);

				return tokens.every((token) => haystack.includes(token));
			})
			.slice(0, 40);
	}, [commands, query]);

	useEffect(() => {
		setActiveIndex(0);
	}, [query]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
	}, [activeIndex, isOpen]);

	if (!isOpen || typeof document === "undefined") {
		return null;
	}

	function handleListKeyDown(event: React.KeyboardEvent) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActiveIndex((current) => (current + 1) % Math.max(1, matches.length));

			return;
		}

		if (event.key === "ArrowUp") {
			event.preventDefault();
			setActiveIndex((current) => (current - 1 + matches.length) % Math.max(1, matches.length));

			return;
		}

		if (event.key === "Enter") {
			event.preventDefault();
			matches[activeIndex]?.run();
		}
	}

	return createPortal(
		<div
			className="palette-backdrop"
			onClick={(event) => {
				if (event.target === event.currentTarget) {
					setIsOpen(false);
				}
			}}
			role="presentation"
		>
			<div
				aria-label="Command palette"
				aria-modal="true"
				className="palette"
				ref={dialogRef}
				role="dialog"
			>
				<input
					aria-activedescendant={matches[activeIndex] ? `palette-${matches[activeIndex].id}` : ""}
					aria-controls="palette-list"
					aria-expanded
					aria-label="Search Pashi"
					autoComplete="off"
					className="palette-input"
					onChange={(event) => setQuery(event.target.value)}
					onKeyDown={handleListKeyDown}
					placeholder="Search tools, pages and actions"
					role="combobox"
					value={query}
				/>
				<div className="palette-list" id="palette-list" ref={listRef} role="listbox">
					{matches.map((command, index) => (
						<button
							key={command.id}
							aria-selected={index === activeIndex}
							className="palette-option"
							data-active={index === activeIndex}
							id={`palette-${command.id}`}
							onClick={command.run}
							onMouseEnter={() => setActiveIndex(index)}
							role="option"
							type="button"
						>
							<span className="palette-option-group">{command.group}</span>
							<span className="palette-option-label">{command.label}</span>
							{command.hint ? <span className="palette-option-hint">{command.hint}</span> : null}
						</button>
					))}
					{matches.length === 0 ? <p className="palette-empty">Nothing matches that.</p> : null}
				</div>
				<p className="palette-footnote">
					Enter opens · Arrows move · Esc closes ·{" "}
					<button
						className="palette-favourite"
						onClick={() => {
							const command = matches[activeIndex];

							if (!command?.id.startsWith("tool-")) {
								return;
							}

							const [, toolType, ...rest] = command.id.split("-");

							toggleFavourite({
								label: command.label,
								mode: toolType === "converter" ? "convert" : "generate",
								toolId: rest.join("-"),
							});
							setFavourites(listFavourites());
						}}
						type="button"
					>
						Pin the highlighted tool
					</button>
				</p>
			</div>
		</div>,
		document.body,
	);
}
