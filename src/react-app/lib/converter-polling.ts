import {
	conversionJobStatus,
	conversionJobStatusUrl,
	fetchConversionJob,
	isPendingConversionJob,
	type ConvertResult,
} from "./converter-api.ts";

type TimerId = number | ReturnType<typeof setTimeout>;

interface ConversionJobPollerOptions {
	fetchJob?: (statusUrl: string) => Promise<ConvertResult>;
	initialDelayMs?: number;
	intervalMs?: number;
	onError: (error: Error) => void;
	onResult: (result: ConvertResult) => void;
	onSettled: (status: string | undefined) => void;
	scheduler?: {
		clearTimeout: (timerId: TimerId | undefined) => void;
		setTimeout: (callback: () => void, delayMs: number) => TimerId;
	};
}

export interface ConversionJobPoller {
	start: (initialResult: ConvertResult) => void;
	stop: () => void;
}

const defaultScheduler = {
	clearTimeout: (timerId: TimerId | undefined) => window.clearTimeout(timerId),
	setTimeout: (callback: () => void, delayMs: number) => window.setTimeout(callback, delayMs),
};

export function createConversionJobPoller({
	fetchJob = fetchConversionJob,
	initialDelayMs = 0,
	intervalMs = 1800,
	onError,
	onResult,
	onSettled,
	scheduler = defaultScheduler,
}: ConversionJobPollerOptions): ConversionJobPoller {
	let timerId: TimerId | undefined;
	let runId = 0;

	function stop() {
		runId += 1;
		scheduler.clearTimeout(timerId);
		timerId = undefined;
	}

	function start(initialResult: ConvertResult) {
		stop();
		onResult(initialResult);

		if (!isPendingConversionJob(initialResult)) {
			onSettled(conversionJobStatus(initialResult));
			return;
		}

		const pollUrl = conversionJobStatusUrl(initialResult);
		if (!pollUrl) {
			onSettled(conversionJobStatus(initialResult));
			return;
		}

		const statusUrl = pollUrl;
		const currentRunId = runId;

		async function poll() {
			try {
				const nextResult = await fetchJob(statusUrl);
				if (runId !== currentRunId) {
					return;
				}

				onResult(nextResult);
				if (isPendingConversionJob(nextResult)) {
					timerId = scheduler.setTimeout(poll, intervalMs);
					return;
				}

				timerId = undefined;
				onSettled(conversionJobStatus(nextResult));
			} catch (caught) {
				if (runId !== currentRunId) {
					return;
				}

				timerId = undefined;
				onError(caught instanceof Error ? caught : new Error("Could not load conversion job."));
			}
		}

		timerId = scheduler.setTimeout(poll, initialDelayMs);
	}

	return { start, stop };
}
