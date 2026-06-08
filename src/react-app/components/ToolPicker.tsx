import {
	type CSSProperties,
	type KeyboardEvent as ReactKeyboardEvent,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";

import type { GeneratorInfoTool } from "../lib/generator-info";

const RECENT_TOOLS_KEY = "pashi:recent-tools";

interface ToolPickerProps {
	activeTool: GeneratorInfoTool;
	onChange: (toolId: string) => void;
	tools: GeneratorInfoTool[];
}

export function ToolPicker({ activeTool, onChange, tools }: ToolPickerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>({
		left: 0,
		maxHeight: 320,
		side: "bottom",
	});
	const [query, setQuery] = useState("");
	const [recentToolIds, setRecentToolIds] = useState<string[]>(() => readRecentToolIds());
	const triggerRef = useRef<HTMLButtonElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const listboxId = useId();
	const groups = useMemo(
		() => groupTools(filterTools(tools, query), recentToolIds),
		[query, recentToolIds, tools],
	);
	const flatTools = useMemo(() => groups.flatMap((group) => group.tools), [groups]);
	const activeOptionId = flatTools[activeIndex] ? optionId(listboxId, flatTools[activeIndex].id) : undefined;
	const menuStyle = useMemo<ToolMenuStyle>(
		() => ({
			"--tool-menu-left": `${menuPlacement.left}px`,
			"--tool-menu-max-height": `${menuPlacement.maxHeight}px`,
		}),
		[menuPlacement],
	);
	const updatePlacement = useCallback(() => {
		const trigger = triggerRef.current;
		if (!trigger) {
			return;
		}

		const rect = trigger.getBoundingClientRect();
		const rootRect = rootRef.current?.getBoundingClientRect();
		const gap = 8;
		const padding = 12;
		const pageBottom = document.querySelector(".shell")?.getBoundingClientRect().bottom ?? window.innerHeight;
		const usableBottom = Math.min(window.innerHeight, pageBottom) - padding;
		const usableTop = padding;
		const below = usableBottom - rect.bottom - gap;
		const above = rect.top - usableTop - gap;
		const side = below >= above ? "bottom" : "top";
		const available = Math.max(160, side === "bottom" ? below : above);

		setMenuPlacement({
			left: rootRect ? rect.left - rootRect.left : 0,
			maxHeight: Math.min(448, available),
			side,
		});
	}, []);
	const openPicker = useCallback(() => {
		const selectedIndex = flatTools.findIndex((tool) => tool.id === activeTool.id);
		setActiveIndex(Math.max(0, selectedIndex));
		updatePlacement();
		setIsOpen(true);
	}, [activeTool.id, flatTools, updatePlacement]);

	const closePicker = useCallback((restoreFocus = false) => {
		setIsOpen(false);

		if (restoreFocus) {
			triggerRef.current?.focus();
		}
	}, []);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		searchRef.current?.focus();
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		function handleWindowChange() {
			updatePlacement();
		}

		window.addEventListener("resize", handleWindowChange);
		window.addEventListener("scroll", handleWindowChange, true);

		return () => {
			window.removeEventListener("resize", handleWindowChange);
			window.removeEventListener("scroll", handleWindowChange, true);
		};
	}, [isOpen, updatePlacement]);

	useEffect(() => {
		const activeOption = activeOptionId ? document.getElementById(activeOptionId) : null;
		activeOption?.scrollIntoView({ block: "nearest" });
	}, [activeOptionId]);

	useEffect(() => {
		function handlePointerDown(event: MouseEvent) {
			if (!rootRef.current?.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				closePicker();
				return;
			}

			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				openPicker();
				return;
			}

			if (event.key === "/" && !isTypingTarget(event.target)) {
				event.preventDefault();
				openPicker();
			}
		}

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [closePicker, openPicker]);

	function selectTool(toolId: string) {
		const nextRecentToolIds = [toolId, ...recentToolIds.filter((id) => id !== toolId)].slice(0, 4);
		setRecentToolIds(nextRecentToolIds);
		writeRecentToolIds(nextRecentToolIds);
		onChange(toolId);
		setQuery("");
		closePicker(true);
	}

	function handlePickerKeyDown(event: ReactKeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			openPicker();
			return;
		}

		if (!isOpen) {
			if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				openPicker();
			}
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			closePicker(true);
			return;
		}

		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActiveIndex((index) => nextOptionIndex(index, flatTools.length, 1));
			return;
		}

		if (event.key === "ArrowUp") {
			event.preventDefault();
			setActiveIndex((index) => nextOptionIndex(index, flatTools.length, -1));
			return;
		}

		if (event.key === "Home") {
			event.preventDefault();
			setActiveIndex(0);
			return;
		}

		if (event.key === "End") {
			event.preventDefault();
			setActiveIndex(Math.max(0, flatTools.length - 1));
			return;
		}

		if (event.key === "Enter") {
			event.preventDefault();
			const tool = flatTools[activeIndex];
			if (tool) {
				selectTool(tool.id);
			}
		}
	}

	return (
		<div className="tool-picker" ref={rootRef}>
			<button
				aria-controls={listboxId}
				aria-expanded={isOpen}
				className="tool-trigger"
				onKeyDown={handlePickerKeyDown}
				onClick={() => {
					if (isOpen) {
						closePicker();
					} else {
						openPicker();
					}
				}}
				ref={triggerRef}
				type="button"
			>
				<span>
					<strong>{activeTool.label}</strong>
					<small>{activeTool.display.category}</small>
				</span>
				<kbd>/</kbd>
			</button>

			{isOpen ? (
				<div
					className="tool-menu"
					data-side={menuPlacement.side}
					style={menuStyle}
				>
					<input
						aria-label="Search generators"
						aria-activedescendant={activeOptionId}
						aria-controls={listboxId}
						aria-expanded={isOpen}
						aria-haspopup="listbox"
						className="tool-search"
						onChange={(event) => {
							setQuery(event.target.value);
							setActiveIndex(0);
						}}
						onKeyDown={handlePickerKeyDown}
						placeholder="Search generators"
						role="combobox"
						ref={searchRef}
						type="search"
						value={query}
					/>
					<div className="tool-list" id={listboxId} role="listbox">
						{groups.map((group) => (
							<div className="tool-group" key={group.label}>
								<p>{group.label}</p>
								{group.tools.map((tool) => (
									<button
										id={optionId(listboxId, tool.id)}
										aria-selected={tool.id === activeTool.id}
										className="tool-option"
										data-active={flatTools[activeIndex]?.id === tool.id ? "true" : undefined}
										key={`${group.label}-${tool.id}`}
										onClick={() => selectTool(tool.id)}
										role="option"
										tabIndex={-1}
										type="button"
									>
										<span>{tool.label}</span>
										<small>{tool.description}</small>
									</button>
								))}
							</div>
						))}
						{groups.length === 0 ? <p className="tool-empty">No generator found.</p> : null}
					</div>
				</div>
			) : null}
		</div>
	);
}

interface MenuPlacement {
	left: number;
	maxHeight: number;
	side: "bottom" | "top";
}

type ToolMenuStyle = CSSProperties & {
	"--tool-menu-left": string;
	"--tool-menu-max-height": string;
};

function nextOptionIndex(index: number, length: number, direction: 1 | -1) {
	if (length === 0) {
		return 0;
	}

	return (index + direction + length) % length;
}

function optionId(listboxId: string, toolId: string) {
	return `${listboxId}-${toolId}`;
}

function filterTools(tools: GeneratorInfoTool[], query: string) {
	const tokens = normalise(query).split(" ").filter(Boolean);
	if (tokens.length === 0) {
		return tools;
	}

	return tools.filter((tool) => {
		const haystack = normalise(
			`${tool.label} ${tool.description} ${tool.display.category} ${tool.audience}`,
		);
		return tokens.every((token) => haystack.includes(token));
	});
}

function groupTools(tools: GeneratorInfoTool[], recentToolIds: string[]) {
	const recentTools = recentToolIds
		.map((toolId) => tools.find((tool) => tool.id === toolId))
		.filter((tool): tool is GeneratorInfoTool => Boolean(tool));
	const groups = new Map<string, GeneratorInfoTool[]>();

	for (const tool of tools) {
		const group = groups.get(tool.display.category) ?? [];
		group.push(tool);
		groups.set(tool.display.category, group);
	}

	return [
		...(recentTools.length > 0 ? [{ label: "Recent", tools: recentTools }] : []),
		...Array.from(groups, ([label, groupedTools]) => ({ label, tools: groupedTools })),
	];
}

function normalise(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isTypingTarget(target: EventTarget | null) {
	return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function readRecentToolIds() {
	try {
		const value = localStorage.getItem(RECENT_TOOLS_KEY);
		return value ? (JSON.parse(value) as string[]) : [];
	} catch {
		return [];
	}
}

function writeRecentToolIds(toolIds: string[]) {
	try {
		localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(toolIds));
	} catch {
		// Recent tools are a convenience only.
	}
}
