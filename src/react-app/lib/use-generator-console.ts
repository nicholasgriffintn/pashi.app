import {
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { generateThing } from "./generate-api";
import { fetchGeneratorInfo, type GeneratorInfoTool } from "./generator-info";
import {
	createImageResult,
	findToolByRoute,
	getDefaultFieldValues,
	getDefaultInput,
	getInitialValues,
	getRouteToolId,
	pushGeneratorRoute,
	type GeneratorValues,
} from "./generator-state";
import type { ResultStageValue } from "./result-types";

function createInitialResult(
	tool: GeneratorInfoTool,
	values: GeneratorValues,
	generateId: number,
) {
	return tool.result.kind === "image"
		? createImageResult(tool, values.input, values.fields, generateId)
		: undefined;
}

export function useGeneratorConsole() {
	const initialRouteToolId = getRouteToolId();
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
	const [notification, setNotification] = useState("");
	const [result, setResult] = useState<ResultStageValue | undefined>();
	const notificationTimer = useRef<number | undefined>(undefined);

	const activeTool = useMemo(
		() => tools.find((tool) => tool.id === activeToolId),
		[activeToolId, tools],
	);

	const notify = useCallback((message: string) => {
		window.clearTimeout(notificationTimer.current);
		setNotification(message);
		notificationTimer.current = window.setTimeout(() => setNotification(""), 2400);
	}, []);

	const applyToolValues = useCallback(
		(nextTool: GeneratorInfoTool, values: GeneratorValues) => {
			setActiveToolId(nextTool.id);
			setInput(values.input);
			setFieldValues(values.fields);
			setError("");
			setResultMode("standard");
			setIsLoading(false);
			setResult(createInitialResult(nextTool, values, 0));
		},
		[],
	);

	useEffect(() => {
		return () => window.clearTimeout(notificationTimer.current);
	}, []);

	useEffect(() => {
		let ignore = false;

		fetchGeneratorInfo()
			.then((info) => {
				if (ignore || info.tools.length === 0) {
					return;
				}

				const nextTool =
					findToolByRoute(info.tools, getRouteToolId()) ?? info.tools[0];
				setTools(info.tools);
				setExportFormats(info.exportFormats);
				applyToolValues(nextTool, getInitialValues(nextTool));
			})
			.catch((caught) => {
				if (!ignore) {
					setError(caught instanceof Error ? caught.message : "Could not load generators.");
				}
			})
			.finally(() => {
				if (!ignore) {
					setIsInfoLoading(false);
					notify("Generators ready");
				}
			});

		return () => {
			ignore = true;
		};
	}, [applyToolValues, notify]);

	useEffect(() => {
		if (tools.length === 0) {
			return;
		}

		function handlePopState() {
			const nextTool = findToolByRoute(tools, getRouteToolId()) ?? tools[0];
			applyToolValues(nextTool, getInitialValues(nextTool));
		}

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [applyToolValues, tools]);

	async function generateActiveTool(aiMode = resultMode === "ai") {
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
			setResult(createImageResult(activeTool, input, fieldValues, nextGenerateId));
			return;
		}

		try {
			setResult(await generateThing(
				activeTool.endpoint,
				input,
				aiMode ? { ...fieldValues, mode: "ai" } : fieldValues,
			));
			setResultMode(aiMode ? "ai" : "standard");
			setIsLoading(false);
		} catch (caught) {
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

		applyToolValues(nextTool, {
			fields: getDefaultFieldValues(nextTool),
			input: getDefaultInput(nextTool),
		});
		pushGeneratorRoute(nextTool.id);
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

	return {
		activeTool,
		activeToolId,
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
		result,
		resultMode,
		setResultMode,
		setInput,
		tools,
	};
}
