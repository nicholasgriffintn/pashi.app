import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	convertImageThing,
	convertThing,
	convertQueuedThing,
	type SlackmojiBatchResult,
	fetchConverterInfo,
	type ConverterInfoTool,
	type ConvertResult,
	conversionJobStatus,
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

function normaliseSlackmojiEffects(value: string | undefined) {
	const values = (value ?? "")
		.split(",")
		.map((item) => item.trim().toLowerCase().replace(/^:+/, "").replace(/:+$/, ""))
		.filter((effect) => effect !== "" && effect !== "none");

	const seen = new Set<string>();
	const result = values.filter((effect) => {
		if (seen.has(effect)) {
			return false;
		}
		seen.add(effect);
		return true;
	});

	if (result.length === 0) {
		return [];
	}

	return result;
}

function defaultSlackmojiEffect(): string {
	return "spinning";
}

function queuedConversionMeta(result: ConvertResult) {
	if (
		result.kind !== "fields" ||
		typeof result.result === "string" ||
		Array.isArray(result.result)
	) {
		return {
			error: "",
			jobId: "",
			status: "",
			downloadUrl: "",
		};
	}

	return {
		error: typeof result.result.error === "string" ? result.result.error : "",
		jobId: typeof result.result.jobId === "string" ? result.result.jobId : "",
		status: typeof result.result.status === "string" ? result.result.status : "",
		downloadUrl: typeof result.result.downloadUrl === "string" ? result.result.downloadUrl : "",
	};
}

function createInitialBatchResult(effect: string, result: ConvertResult, fallbackJobId: string) {
	const meta = queuedConversionMeta(result);
	const status = meta.status || conversionJobStatus(result) || "queued";

	return {
		error: meta.error,
		effect,
		jobId: meta.jobId || fallbackJobId,
		result,
		downloadUrl: meta.downloadUrl,
		status,
	};
}

function createSlackmojiBatchResult(items: SlackmojiBatchResult[]) {
	return {
		alt: "Generated Slackmoji animations",
		generatedAt: new Date().toISOString(),
		items,
		kind: "slackmoji-batch" as const,
	};
}

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

function defaultConverterFields(tool: ConverterInfoTool) {
	const fields: Record<string, string> = {};
	for (const field of tool.api?.fields ?? []) {
		if (field.id === "outputFormat") {
			continue;
		}

		if (field.defaultValue !== undefined) {
			fields[field.id] = field.defaultValue;
		} else if (field.values?.length) {
			fields[field.id] = field.values[0] ?? "";
		}
	}

	return fields;
}

function findSourcePresetField(tool: ConverterInfoTool) {
	return tool.api?.fields.find((field) => field.display?.control === "source-presets");
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
	const [converterFields, setConverterFields] = useState<Record<string, string>>({});
	const [selectedFile, setSelectedFile] = useState<File | undefined>();
	const [error, setError] = useState("");
	const [isInfoLoading, setIsInfoLoading] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [notification, setNotification] = useState("");
	const [result, setResult] = useState<ResultStageValue | undefined>();
	const objectUrlRef = useRef<string | undefined>(undefined);
	const notificationTimer = useRef<number | undefined>(undefined);
	const pollerRef = useRef<ConversionJobPoller | undefined>(undefined);
	const slackmojiPollersRef = useRef<ConversionJobPoller[]>([]);
	const slackmojiBatchResultsRef = useRef<SlackmojiBatchResult[]>([]);
	const slackmojiPendingResults = useRef(0);

	const activeTool = useMemo(
		() => tools.find((tool) => tool.id === activeToolId),
		[activeToolId, tools],
	);

	const notify = useCallback((message: string) => {
		window.clearTimeout(notificationTimer.current);
		setNotification(message);
		notificationTimer.current = window.setTimeout(() => setNotification(""), 2400);
	}, []);

	const stopSlackmojiPollers = useCallback(() => {
		for (const poller of slackmojiPollersRef.current) {
			poller.stop();
		}

		slackmojiPollersRef.current = [];
		slackmojiPendingResults.current = 0;
	}, []);

	const stopPolling = useCallback(() => {
		pollerRef.current?.stop();
		stopSlackmojiPollers();
	}, [stopSlackmojiPollers]);

	const syncSlackmojiBatchResults = useCallback((jobId: string, patch: Partial<SlackmojiBatchResult>) => {
		const nextResults = slackmojiBatchResultsRef.current.map((batchItem) => (
			batchItem.jobId === jobId
				? { ...batchItem, ...patch }
				: batchItem
		));
		slackmojiBatchResultsRef.current = nextResults;
		setResult((previous) => {
			if (previous?.kind !== "slackmoji-batch") {
				return createSlackmojiBatchResult(nextResults);
			}

			return {
				...previous,
				items: nextResults,
			};
		});
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
		setConverterFields(defaultConverterFields(nextTool));
		slackmojiBatchResultsRef.current = [];
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
				notify("Converters ready");
			})
			.catch((caught) => {
				if (!ignore) {
					setError(caught instanceof Error ? caught.message : "Could not load converters.");
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

	async function startSlackmojiBatchConversion(endpoint: string, fields: Record<string, string>, file?: File) {
		const requestedEffects = normaliseSlackmojiEffects(fields.effect);
		const effects = requestedEffects.length > 0 ? requestedEffects : [defaultSlackmojiEffect()];
		const fieldJobs = effects.map((effect) => ({ ...fields, effect }));
		const batchResults = await Promise.all(fieldJobs.map((fieldJob) =>
			convertQueuedThing(endpoint, file, fieldJob),
		));
		const batchInitialResults = batchResults.map((batchResult, index) => (
			createInitialBatchResult(fieldJobs[index]?.effect ?? "", batchResult, `slackmoji-batch-${index}`)
		));

		if (batchInitialResults.length === 0) {
			throw new Error("No animations selected.");
		}

		setResult(createSlackmojiBatchResult(batchInitialResults));

		slackmojiBatchResultsRef.current = batchInitialResults;
		const finalize = () => {
			const remaining = --slackmojiPendingResults.current;
			if (remaining > 0) {
				return;
			}

			setIsLoading(false);
			const hasFailure = slackmojiBatchResultsRef.current.some((item) => item.status === "failed");
			if (hasFailure) {
				setError("One or more Slack animations failed.");
			} else {
				notify("Conversion ready");
			}
		};

		slackmojiPendingResults.current = batchInitialResults.length;
		slackmojiPollersRef.current = batchInitialResults.map((batchItem) =>
			createConversionJobPoller({
				onError: (caught) => {
					syncSlackmojiBatchResults(batchItem.jobId, { status: "failed", error: caught.message });
					setError(caught.message);
				},
				onResult: (nextResult) => {
					const status = conversionJobStatus(nextResult) ?? batchItem.status;
					const meta = queuedConversionMeta(nextResult);
					syncSlackmojiBatchResults(batchItem.jobId, {
						result: nextResult,
						status: status || "queued",
						downloadUrl: meta.downloadUrl,
						error: meta.error,
					});
				},
				onSettled: (status) => {
					syncSlackmojiBatchResults(batchItem.jobId, { status: status ?? batchItem.status });
					finalize();
				},
			}),
		);

		for (const [index, batchItem] of batchInitialResults.entries()) {
			slackmojiPollersRef.current[index]?.start(batchItem.result);
		}
	}

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
			const sourcePresetField = findSourcePresetField(activeTool);
			const sourceKey = sourcePresetField ? converterFields[sourcePresetField.id]?.trim() : "";
			const hasSourceKey = Boolean(sourceKey);
			const hasImageUrl = activeTool.id === "image-format" && Boolean(input.trim());

			if (!selectedFile && !hasSourceKey && !hasImageUrl) {
				const requirement = sourcePresetField
					? `${activeTool.input.label.toLowerCase()} or a preset`
					: activeTool.id === "image-format"
					? `${activeTool.input.label.toLowerCase()} or image URL`
					: activeTool.input.label.toLowerCase();
				setError(`Choose ${requirement} to convert.`);
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
					...converterFields,
					outputFormat: outputFormat || activeTool.outputs[0] || "txt",
					...(selectedFile ? { sourceName: selectedFile.name } : {}),
				};
				if (activeTool.id === "image-format" && !selectedFile && hasImageUrl) {
					const format = outputFormat || activeTool.outputs[0] || "webp";
					const blob = await convertImageThing(activeTool.endpoint, input, { outputFormat: format });
					if (objectUrlRef.current) {
						URL.revokeObjectURL(objectUrlRef.current);
					}
					objectUrlRef.current = URL.createObjectURL(blob);
					setResult(createImageConverterResult(activeTool, input, format, objectUrlRef.current));
					return;
				}
				if (activeTool.runtime === "container") {
					if (activeTool.id === "slackmoji") {
						await startSlackmojiBatchConversion(activeTool.endpoint, fields, selectedFile);
					} else {
						const nextResult = await convertQueuedThing(activeTool.endpoint, selectedFile, fields);
						pollConversionJob(nextResult);
					}
				} else {
					if (!selectedFile) {
						setError(`Choose ${activeTool.input.label.toLowerCase()} to convert.`);
						setIsLoading(false);
						return;
					}

					const nextResult = await convertThing(activeTool.endpoint, await selectedFile.text(), fields);
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
			const fields = {
				...converterFields,
				...(outputFormat ? { outputFormat } : {}),
			};

			setResult(await convertThing(
				activeTool.endpoint,
				input,
				fields,
			));
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
		slackmojiBatchResultsRef.current = [];
		if (objectUrlRef.current) {
			URL.revokeObjectURL(objectUrlRef.current);
			objectUrlRef.current = undefined;
		}
		setResult(undefined);
		setError("");
		setIsLoading(false);
	}

	return {
		activeTool,
		activeToolId,
		clearResult,
		convertActiveTool,
		converterFields,
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
		setConverterField: (fieldId: string, value: string) => {
			setConverterFields((previous) => ({
					...previous,
					[fieldId]: value,
				}));
		},
		setOutputFormat,
		setInput,
		setSelectedFile: (file: File | undefined) => {
			setSelectedFile(file);
			if (file) {
				setConverterFields((previous) => ({ ...previous, sourceKey: "" }));
			}
		},
		tools,
	};
}
