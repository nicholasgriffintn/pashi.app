import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	convertFileThing,
	convertImageThing,
	convertThing,
	fetchConverterInfo,
	type ConverterInfoTool,
	type ConvertResult,
} from "./converter-api";
import { createConversionJobPoller, type ConversionJobPoller } from "./converter-polling";
import {
	findConverterByRoute,
	getDefaultConverterInput,
	getInitialConverterValues,
	getRouteConverterId,
	pushConverterRoute,
} from "./converter-state";
import type { ResultStageValue } from "./result-types";

function createImageConverterResult(
	activeTool: ConverterInfoTool,
	input: string,
	outputFormat: string,
	src: string,
): ResultStageValue {
	const format = outputFormat || activeTool.outputs[0] || "webp";
	const params = new URLSearchParams({
		input,
		outputFormat: format,
	});
	const extension = format === "jpeg" ? "jpg" : format;

	return {
		alt: `${activeTool.label} result`,
		downloadName: `pashi-image.${extension}`,
		generatedAt: new Date().toISOString(),
		kind: "image",
		sourceUrl: `${activeTool.endpoint}?${params.toString()}`,
		src,
	};
}

function pickInitialConverter(tools: readonly ConverterInfoTool[]) {
	return (
		findConverterByRoute(tools, getRouteConverterId()) ??
		tools.find((tool) => tool.status === "available") ??
		tools[0]
	);
}

export function useConverterConsole() {
	const initialRouteConverterId = getRouteConverterId();
	const [tools, setTools] = useState<ConverterInfoTool[]>([]);
	const [activeToolId, setActiveToolId] = useState(initialRouteConverterId ?? "");
	const [input, setInput] = useState("");
	const [outputFormat, setOutputFormat] = useState("");
	const [selectedFile, setSelectedFile] = useState<File | undefined>();
	const [error, setError] = useState("");
	const [isInfoLoading, setIsInfoLoading] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [notification, setNotification] = useState("");
	const [result, setResult] = useState<ResultStageValue | undefined>();
	const objectUrlRef = useRef<string | undefined>(undefined);
	const notificationTimer = useRef<number | undefined>(undefined);
	const pollerRef = useRef<ConversionJobPoller | undefined>(undefined);

	const activeTool = useMemo(
		() => tools.find((tool) => tool.id === activeToolId),
		[activeToolId, tools],
	);

	const notify = useCallback((message: string) => {
		window.clearTimeout(notificationTimer.current);
		setNotification(message);
		notificationTimer.current = window.setTimeout(() => setNotification(""), 2400);
	}, []);

	const stopPolling = useCallback(() => {
		pollerRef.current?.stop();
	}, []);

	const pollConversionJob = useCallback((initialResult: ConvertResult) => {
		const poller = createConversionJobPoller({
			onError: (caught) => {
				setError(caught.message);
				setIsLoading(false);
			},
			onResult: setResult,
			onSettled: (status) => {
				setIsLoading(false);
				if (status === "complete") {
					notify("Conversion ready");
				} else if (status === "failed") {
					setError("Conversion failed.");
				}
			},
		});
		pollerRef.current = poller;
		poller.start(initialResult);
	}, [notify]);

	const applyToolValues = useCallback((nextTool: ConverterInfoTool, nextInput: string) => {
		stopPolling();
		setActiveToolId(nextTool.id);
		setInput(nextInput);
		setOutputFormat(nextTool.outputs[0] ?? "");
		setSelectedFile(undefined);
		setError("");
		setIsLoading(false);
		if (objectUrlRef.current) {
			URL.revokeObjectURL(objectUrlRef.current);
			objectUrlRef.current = undefined;
		}
		setResult(undefined);
	}, [stopPolling]);

	useEffect(() => {
		return () => {
			stopPolling();
			window.clearTimeout(notificationTimer.current);
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current);
			}
		};
	}, [stopPolling]);

	useEffect(() => {
		let ignore = false;

		fetchConverterInfo()
			.then((info) => {
				if (ignore || info.tools.length === 0) {
					return;
				}

				const nextTool = pickInitialConverter(info.tools);
				setTools(info.tools);
				applyToolValues(nextTool, getInitialConverterValues(nextTool).input);
			})
			.catch((caught) => {
				if (!ignore) {
					setError(caught instanceof Error ? caught.message : "Could not load converters.");
				}
			})
			.finally(() => {
				if (!ignore) {
					setIsInfoLoading(false);
					notify("Converters ready");
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
			const nextTool = pickInitialConverter(tools);
			applyToolValues(nextTool, getInitialConverterValues(nextTool).input);
		}

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [applyToolValues, tools]);

	async function convertActiveTool() {
		stopPolling();
		setError("");
		setIsLoading(true);

		if (!activeTool) {
			setError("Converters are still loading.");
			setIsLoading(false);
			return;
		}

		if (activeTool.input.kind === "file") {
			if (!selectedFile) {
				setError(`Choose ${activeTool.input.label.toLowerCase()} to convert.`);
				setIsLoading(false);
				return;
			}

			if (activeTool.status !== "available" || !activeTool.endpoint) {
				setError(`${activeTool.label} conversion needs an API-backed implementation.`);
				setIsLoading(false);
				return;
			}

			try {
				const fields = {
					outputFormat: outputFormat || activeTool.outputs[0] || "txt",
					sourceName: selectedFile.name,
				};
				const nextResult = activeTool.runtime === "container"
					? await convertFileThing(activeTool.endpoint, selectedFile, fields)
					: await convertThing(activeTool.endpoint, await selectedFile.text(), fields);
				if (activeTool.runtime === "container") {
					pollConversionJob(nextResult);
				} else {
					setResult(nextResult);
					setIsLoading(false);
				}
			} catch (caught) {
				setError(caught instanceof Error ? caught.message : "Conversion failed.");
				setIsLoading(false);
			}
			return;
		}

		if (activeTool.status !== "available" || !activeTool.endpoint) {
			setError(`${activeTool.label} conversion is not available yet.`);
			setIsLoading(false);
			return;
		}

		if (activeTool.input.required && !input.trim()) {
			setError(`Paste ${activeTool.input.label.toLowerCase()} to convert.`);
			setIsLoading(false);
			return;
		}

		try {
			if (activeTool.id === "image-format") {
				const format = outputFormat || activeTool.outputs[0] || "webp";
				const blob = await convertImageThing(activeTool.endpoint, input, { outputFormat: format });
				if (objectUrlRef.current) {
					URL.revokeObjectURL(objectUrlRef.current);
				}
				objectUrlRef.current = URL.createObjectURL(blob);
				setResult(createImageConverterResult(activeTool, input, format, objectUrlRef.current));
			} else {
				setResult(await convertThing(
					activeTool.endpoint,
					input,
					outputFormat ? { outputFormat } : {},
				));
			}
			setIsLoading(false);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Conversion failed.");
			setIsLoading(false);
		}
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		await convertActiveTool();
	}

	function handleToolChange(nextToolId: string) {
		const nextTool = tools.find((tool) => tool.id === nextToolId);
		if (!nextTool) {
			return;
		}

		applyToolValues(nextTool, getDefaultConverterInput(nextTool));
		pushConverterRoute(nextTool.id);
	}

	function clearResult() {
		stopPolling();
		if (objectUrlRef.current) {
			URL.revokeObjectURL(objectUrlRef.current);
			objectUrlRef.current = undefined;
		}
		setResult(undefined);
	}

	return {
		activeTool,
		activeToolId,
		clearResult,
		convertActiveTool,
		error,
		handleSubmit,
		handleToolChange,
		handleImageError: () => {
			setError("Image conversion failed.");
			setIsLoading(false);
		},
		handleImageLoad: () => setIsLoading(false),
		input,
		isInfoLoading,
		isLoading,
		notification,
		notify,
		outputFormat,
		result,
		selectedFile,
		setOutputFormat,
		setInput,
		setSelectedFile,
		tools,
	};
}
