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
import { createPortal } from "react-dom";

import { searchTools } from "../lib/tool-search";
import { isStringArray } from "../../shared/records";

const MENU_GAP = 8;
const MENU_MAX_HEIGHT = 448;
const MENU_MIN_HEIGHT = 220;
const MENU_VIEWPORT_PADDING = 12;
const MENU_SHADOW_SPACE = 12;

interface ToolPickerProps {
	activeTool?: ToolPickerTool;
	label: string;
	onChange: (toolId: string) => void;
	placeholder?: {
		category: string;
		label: string;
	};
	recentKey: string;
	tools: ToolPickerTool[];
}

export interface ToolPickerTool {
	aliases: readonly string[];
	audience: string;
	description: string;
	display: {
		category: string;
	};
	id: string;
	label: string;
}

interface MenuPlacement {
	bottom?: number;
	left: number;
	maxHeight: number;
	side: "bottom" | "top";
	top?: number;
	width: number;
}

type ToolMenuStyle = CSSProperties & {
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

function groupTools(tools: ToolPickerTool[], recentToolIds: string[]) {
	const recentTools = recentToolIds
		.map((toolId) => tools.find((tool) => tool.id === toolId))
		.filter((tool): tool is ToolPickerTool => Boolean(tool));
	const recentToolIdSet = new Set(recentTools.map((tool) => tool.id));
	const groups = new Map<string, ToolPickerTool[]>();

	for (const tool of tools) {
		if (recentToolIdSet.has(tool.id)) {
			continue;
		}

		const group = groups.get(tool.display.category) ?? [];
		group.push(tool);
		groups.set(tool.display.category, group);
	}

	return [
		...(recentTools.length > 0 ? [{ label: "Recent", tools: recentTools }] : []),
		...Array.from(groups, ([label, groupedTools]) => ({ label, tools: groupedTools })),
	];
}

function isTypingTarget(target: EventTarget | null) {
	return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function readRecentToolIds(recentKey: string) {
	try {
		const value = localStorage.getItem(recentKey);
		const parsed = value ? JSON.parse(value) as unknown : [];
		return isStringArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function writeRecentToolIds(recentKey: string, toolIds: string[]) {
	try {
		localStorage.setItem(recentKey, JSON.stringify(toolIds));
	} catch {
		// Recent tools are a convenience only.
	}
}

export function ToolPicker({ activeTool, label, onChange, placeholder, recentKey, tools }: ToolPickerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>({
		left: 0,
		maxHeight: 320,
		side: "bottom",
		top: 0,
		width: 320,
	});
	const [query, setQuery] = useState("");
	const [recentToolIds, setRecentToolIds] = useState<string[]>(() => readRecentToolIds(recentKey));
	const triggerRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const listboxId = useId();
	const groups = useMemo(
		() => groupTools(searchTools(tools, query), recentToolIds),
		[query, recentToolIds, tools],
	);
	const flatTools = useMemo(() => groups.flatMap((group) => group.tools), [groups]);
	const activeOptionId = flatTools[activeIndex] ? optionId(listboxId, flatTools[activeIndex].id) : undefined;
	const menuStyle = useMemo<ToolMenuStyle>(
		() => ({
			bottom: menuPlacement.bottom,
			left: menuPlacement.left,
			top: menuPlacement.top,
			width: menuPlacement.width,
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
		const usableBottom = window.innerHeight - MENU_VIEWPORT_PADDING;
		const usableTop = MENU_VIEWPORT_PADDING;
		const below = usableBottom - rect.bottom - MENU_GAP - MENU_SHADOW_SPACE;
		const above = rect.top - usableTop - MENU_GAP - MENU_SHADOW_SPACE;
		const side = below >= MENU_MIN_HEIGHT || below >= above ? "bottom" : "top";
		const available = Math.max(0, side === "bottom" ? below : above);
		const maxHeight = Math.max(96, Math.min(MENU_MAX_HEIGHT, available));
		const left = Math.max(MENU_VIEWPORT_PADDING, Math.min(rect.left, window.innerWidth - MENU_VIEWPORT_PADDING - rect.width));

		setMenuPlacement({
			bottom: side === "top" ? window.innerHeight - rect.top + MENU_GAP : undefined,
			left,
			maxHeight,
			side,
			top: side === "bottom" ? rect.bottom + MENU_GAP : undefined,
			width: rect.width,
		});
	}, []);
	const openPicker = useCallback(() => {
		const selectedIndex = activeTool ? flatTools.findIndex((tool) => tool.id === activeTool.id) : 0;
		setActiveIndex(Math.max(0, selectedIndex));
		updatePlacement();
		setIsOpen(true);
	}, [activeTool, flatTools, updatePlacement]);

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
			const target = event.target as Node;
			if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
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
		writeRecentToolIds(recentKey, nextRecentToolIds);
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

	const menu = isOpen ? (
		<div
			className="tool-menu"
			data-side={menuPlacement.side}
			ref={menuRef}
			style={menuStyle}
		>
			<input
				aria-label={`Search ${label.toLowerCase()}`}
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
				placeholder={`Search ${label.toLowerCase()}`}
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
								aria-selected={tool.id === activeTool?.id}
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
				{groups.length === 0 ? <p className="tool-empty">No tool found.</p> : null}
			</div>
		</div>
	) : null;

	return (
		<div className="tool-picker" ref={rootRef}>
			<button
				aria-controls={listboxId}
				aria-expanded={isOpen}
				className="tool-trigger"
				data-empty={activeTool ? undefined : "true"}
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
					<strong>{activeTool?.label ?? placeholder?.label ?? `Choose ${label}`}</strong>
					<small>{activeTool?.display.category ?? placeholder?.category ?? "Tool picker"}</small>
				</span>
				<kbd>/</kbd>
			</button>

			{menu ? createPortal(menu, document.body) : null}
		</div>
	);
}
