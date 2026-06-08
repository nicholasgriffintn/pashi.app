import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { GeneratorInfoTool } from "../lib/generator-info";

const RECENT_TOOLS_KEY = "pashi:recent-tools";

interface ToolPickerProps {
	activeTool: GeneratorInfoTool;
	onChange: (toolId: string) => void;
	tools: GeneratorInfoTool[];
}

export function ToolPicker({ activeTool, onChange, tools }: ToolPickerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [recentToolIds, setRecentToolIds] = useState<string[]>(() => readRecentToolIds());
	const rootRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const listboxId = useId();
	const groups = useMemo(
		() => groupTools(filterTools(tools, query), recentToolIds),
		[query, recentToolIds, tools],
	);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		searchRef.current?.focus();
	}, [isOpen]);

	useEffect(() => {
		function handlePointerDown(event: MouseEvent) {
			if (!rootRef.current?.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsOpen(false);
				return;
			}

			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setIsOpen(true);
				return;
			}

			if (event.key === "/" && !isTypingTarget(event.target)) {
				event.preventDefault();
				setIsOpen(true);
			}
		}

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	function selectTool(toolId: string) {
		const nextRecentToolIds = [toolId, ...recentToolIds.filter((id) => id !== toolId)].slice(0, 4);
		setRecentToolIds(nextRecentToolIds);
		writeRecentToolIds(nextRecentToolIds);
		onChange(toolId);
		setQuery("");
		setIsOpen(false);
	}

	return (
		<div className="tool-picker" ref={rootRef}>
			<button
				aria-controls={listboxId}
				aria-expanded={isOpen}
				className="tool-trigger"
				onClick={() => setIsOpen((value) => !value)}
				type="button"
			>
				<span>
					<strong>{activeTool.label}</strong>
					<small>{activeTool.display.category}</small>
				</span>
				<kbd>/</kbd>
			</button>

			{isOpen ? (
				<div className="tool-menu">
					<input
						aria-label="Search generators"
						className="tool-search"
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search generators"
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
										aria-selected={tool.id === activeTool.id}
										className="tool-option"
										key={`${group.label}-${tool.id}`}
										onClick={() => selectTool(tool.id)}
										role="option"
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
