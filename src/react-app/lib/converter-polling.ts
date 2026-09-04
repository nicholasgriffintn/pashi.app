import {
	conversionJobStatus,
	conversionJobStatusUrl,
	fetchConversionJob,
	isPendingConversionJob,
	type ConvertResult,
} from "./converter-api.ts";

type TimerId = number;

interface ConversionJobPollerOptions {
	fetchJob?: (statusUrl: string) => Promise<ConvertResult>;
	initialDelayMs?: number;
	intervalMs?: number;
	maxAttempts?: number;
	maxConsecutiveErrors?: number;
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

const MAX_BACKOFF_MS = 8000;

export function nextPollDelay(baseDelayMs: number, attempt: number) {
	return Math.min(Math.round(baseDelayMs * 1.35 ** attempt), MAX_BACKOFF_MS);
}

export function createConversionJobPoller({
	fetchJob = fetchConversionJob,
	initialDelayMs = 0,
	intervalMs = 1500,
	maxAttempts = 60,
	maxConsecutiveErrors = 3,
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

		const pollUrl = conversionJobStatusUrl(initialResult);

		if (!isPendingConversionJob(initialResult) || !pollUrl) {
			onSettled(conversionJobStatus(initialResult));

			return;
		}

		const statusUrl = pollUrl;
		const currentRunId = runId;
		let attempts = 0;
		let consecutiveErrors = 0;

		function fail(message: string, status?: string) {
			timerId = undefined;
			onError(new Error(message));
			onSettled(status);
		}

		async function poll() {
			attempts += 1;

			try {
				const nextResult = await fetchJob(statusUrl);

				if (runId !== currentRunId) {
					return;
				}

				consecutiveErrors = 0;
				onResult(nextResult);

				if (!isPendingConversionJob(nextResult)) {
					timerId = undefined;
					onSettled(conversionJobStatus(nextResult));

					return;
				}

				if (attempts >= maxAttempts) {
					fail("Conversion is taking too long. Try again.", conversionJobStatus(nextResult));

					return;
				}

				timerId = scheduler.setTimeout(poll, nextPollDelay(intervalMs, attempts));
			} catch (caught) {
				if (runId !== currentRunId) {
					return;
				}

				consecutiveErrors += 1;

				if (consecutiveErrors >= maxConsecutiveErrors || attempts >= maxAttempts) {
					fail(
						caught instanceof Error ? caught.message : "Could not load conversion job.",
						undefined,
					);

					return;
				}

				timerId = scheduler.setTimeout(poll, nextPollDelay(intervalMs, attempts));
			}
		}

		timerId = scheduler.setTimeout(poll, initialDelayMs);
	}

	return { start, stop };
}
