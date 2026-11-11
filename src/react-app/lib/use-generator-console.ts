import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ToolExample } from "../../shared/tool-examples";
import { useApiKey } from "./api-key-context";
import { generateThing } from "./generate-api";
import { fetchGeneratorInfo, type GeneratorInfoTool } from "./generator-info";
import {
	createImageResult,
	findToolByRoute,
	generatorRequestFields,
	generatorValuesFromExample,
	getDefaultGeneratorValues,
	getInitialValues,
	type GeneratorValues,
} from "./generator-state";
import { clearHistory, readHistory, saveHistoryEntry } from "./history-store";
import { replaceAppSearch } from "./navigation";
import { appendResultHistory, clearResultHistoryForResult } from "./result-history";
import type { ResultStageValue } from "./result-types";
import { buildShareSearch } from "./share-link";
import { useNotification } from "./use-notification";

function createInitialResult(tool: GeneratorInfoTool, values: GeneratorValues, generateId: number) {
	return tool.result.kind === "image"
		? createImageResult(tool, values.input, generatorRequestFields(tool, values.fields), generateId)
		: undefined;
}

export interface ToolConsoleRoute {
	navigateToTool: (toolId: string, options?: { replace?: boolean }) => void;
	routeToolId?: string;
}

export function useGeneratorConsole({ navigateToTool, routeToolId }: ToolConsoleRoute) {
	const { apiKey } = useApiKey();
	const initialRouteToolId = routeToolId;
	const [tools, setTools] = useState<GeneratorInfoTool[]>([]);
	const [exportFormats, setExportFormats] = useState<string[]>([]);
	const [activeToolId, setActiveToolId] = useState(initialRouteToolId ?? "");
	const [input, setInput] = useState("");
	const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
	const [error, setError] = useState("");
	const [isInfoLoading, setIsInfoLoading] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [resultMode, setResultMode] = useState<"ai" | "standard">("standard");
	const [generateId, setGenerateId] = useState(0);
	const [result, setResult] = useState<ResultStageValue | undefined>();
	const [resultHistory, setResultHistory] = useState<ResultStageValue[]>([]);
	const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
	const routeToolIdRef = useRef(routeToolId);
	const generateAbortRef = useRef<AbortController | undefined>(undefined);
	const { notification, notify } = useNotification();

	useEffect(() => {
		routeToolIdRef.current = routeToolId;
	}, [routeToolId]);

	const activeTool = useMemo(
		() => tools.find((tool) => tool.id === activeToolId),
		[activeToolId, tools],
	);
	const requestFields = useMemo(
		() => (activeTool ? generatorRequestFields(activeTool, fieldValues) : {}),
		[activeTool, fieldValues],
	);

	const applyToolValues = useCallback((nextTool: GeneratorInfoTool, values: GeneratorValues) => {
		setActiveToolId(nextTool.id);
		setInput(values.input);
		setFieldValues(values.fields);
		setError("");
		setResultMode("standard");
		setIsLoading(false);
		setResult(createInitialResult(nextTool, values, 0));
	}, []);

	const clearToolValues = useCallback(() => {
		setActiveToolId("");
		setInput("");
		setFieldValues({});
		setError("");
		setResultMode("standard");
		setIsLoading(false);
		setResult(undefined);
	}, []);

	useEffect(() => {
		let ignore = false;

		fetchGeneratorInfo()
			.then((info) => {
				if (ignore || info.tools.length === 0) {
					return;
				}

				const nextTool = findToolByRoute(info.tools, routeToolIdRef.current);

				setTools(info.tools);
				setExportFormats(info.exportFormats);
				if (nextTool) {
					applyToolValues(nextTool, getInitialValues(nextTool));
				} else {
					clearToolValues();
				}

				notify("Generators ready");
			})
			.catch((caught) => {
				if (!ignore) {
					setError(caught instanceof Error ? caught.message : "Could not load generators.");
				}
			})
			.finally(() => {
				if (!ignore) {
					setIsInfoLoading(false);
				}
			});

		return () => {
			ignore = true;
		};
	}, [applyToolValues, clearToolValues, notify]);

	useEffect(() => {
		if (!activeToolId || isHistoryLoaded) {
			return;
		}

		let ignore = false;

		readHistory(activeToolId)
			.then((entries) => {
				if (ignore) {
					return;
				}

				setResultHistory(entries.map((entry) => entry.result));
				setIsHistoryLoaded(true);
			})
			.catch(() => {
				if (!ignore) {
					setIsHistoryLoaded(true);
				}
			});

		return () => {
			ignore = true;
		};
	}, [activeToolId, isHistoryLoaded]);

	const [syncedRouteToolId, setSyncedRouteToolId] = useState(routeToolId);

	if (tools.length > 0 && routeToolId !== syncedRouteToolId) {
		const nextTool = findToolByRoute(tools, routeToolId);

		setSyncedRouteToolId(routeToolId);

		setIsHistoryLoaded(false);

		if (nextTool) {
			applyToolValues(nextTool, getInitialValues(nextTool));
		} else {
			clearToolValues();
		}
	}

	async function generateActiveTool(aiMode = resultMode === "ai") {
		generateAbortRef.current?.abort();

		const controller = new AbortController();

		generateAbortRef.current = controller;
		setError("");
		setIsLoading(true);

		if (!activeTool) {
			setError("Generators are still loading.");
			setIsLoading(false);

			return;
		}

		if (activeTool.result.kind === "image") {
			const hasFields = Boolean(activeTool.input.fields?.length);

			if (!hasFields && !input.trim()) {
				setError("Give Pashi something to generate.");
				setIsLoading(false);

				return;
			}

			const nextGenerateId = generateId + 1;

			setGenerateId(nextGenerateId);
			setResultMode("standard");
			setResult(createImageResult(activeTool, input, requestFields, nextGenerateId));
			replaceAppSearch(buildShareSearch(input, requestFields));

			return;
		}

		try {
			const nextResult = await generateThing(
				activeTool.endpoint,
				input,
				aiMode ? { ...requestFields, mode: "ai" } : requestFields,
				apiKey,
				controller.signal,
			);

			if (controller.signal.aborted) {
				return;
			}

			setResultHistory((current) => appendResultHistory(current, result));
			void saveHistoryEntry(activeTool.id, nextResult);
			setResult(nextResult);
			setResultMode(aiMode ? "ai" : "standard");
			setIsLoading(false);
			replaceAppSearch(buildShareSearch(input, requestFields));
		} catch (caught) {
			if (controller.signal.aborted) {
				return;
			}

			setError(caught instanceof Error ? caught.message : "Generation failed.");
			setIsLoading(false);
		}
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		await generateActiveTool();
	}

	function handleToolChange(nextToolId: string) {
		const nextTool = tools.find((tool) => tool.id === nextToolId);

		if (!nextTool) {
			return;
		}

		applyToolValues(nextTool, getDefaultGeneratorValues(nextTool));
		navigateToTool(nextTool.id);
	}

	function applyExample(example: ToolExample) {
		if (!activeTool) {
			return;
		}

		const values = generatorValuesFromExample(activeTool, example);

		setInput(values.input);
		setFieldValues(values.fields);
		setError("");
	}

	function handleFieldChange(fieldId: string, value: string) {
		setFieldValues((current) => ({
			...current,
			[fieldId]: value,
		}));
	}

	function handleImageError() {
		setError("Image generation failed.");
		setIsLoading(false);
	}

	function handleImageLoad() {
		setIsLoading(false);
	}

	function clearResult() {
		setResult(undefined);
	}

	function clearResultHistory() {
		setResultHistory((current) => clearResultHistoryForResult(current, result));
		void clearHistory(activeToolId);
	}

	function restoreResult(restoredResult: ResultStageValue) {
		setResultHistory((current) => appendResultHistory(current, result));
		setResult(restoredResult);
		notify("Result restored");
	}

	return {
		activeTool,
		activeToolId,
		applyExample,
		clearResult,
		error,
		exportFormats,
		fieldValues,
		generateActiveTool,
		handleFieldChange,
		handleImageError,
		handleImageLoad,
		handleSubmit,
		handleToolChange,
		input,
		isInfoLoading,
		isLoading,
		notification,
		notify,
		requestFields,
		result,
		resultHistory,
		resultMode,
		clearResultHistory,
		restoreResult,
		setResultMode,
		setInput,
		tools,
	};
}
