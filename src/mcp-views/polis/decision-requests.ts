import { POLIS_MAX_BUCKETS_PER_REQUEST, type PolisBucket } from "../../shared/polis";
import { errorMessage } from "../shared/errors";
import type { PolisCommand, PolisEvent } from "./engine/protocol";
import { summarisePoll, type PollResult } from "./poll";
import { polisService } from "./service";

const NO_ANSWER = "The decision model did not answer";

type AnswersCommand = Extract<PolisCommand, { type: "answers" }>;

function chunk<T>(items: readonly T[], size: number): T[][] {
	const chunks: T[][] = [];

	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
}

export async function answerDecisions(
	event: Extract<PolisEvent, { type: "decide" }>,
): Promise<AnswersCommand> {
	const { requestId, buckets, laws } = event;

	try {
		const response = await polisService.decide({ buckets, laws });
		const answered = new Set(response.answers.map((answer) => answer.key));

		return {
			type: "answers",
			requestId,
			answers: response.answers,
			failedKeys: buckets.map((bucket) => bucket.key).filter((key) => !answered.has(key)),
			tokens: response.inputTokens,
			model: response.model,
			error: response.error,
		};
	} catch (caught) {
		return {
			type: "answers",
			requestId,
			answers: [],
			failedKeys: buckets.map((bucket) => bucket.key),
			tokens: 0,
			model: null,
			error: errorMessage(caught, NO_ANSWER),
		};
	}
}

export async function pollTown(
	event: Extract<PolisEvent, { type: "pollBuckets" }>,
	proposal: string,
): Promise<PollResult> {
	const { buckets, laws } = event;
	const asked: PolisBucket[] = buckets.map(({ bucket }) => bucket);
	const batches = await Promise.all(
		chunk(asked, POLIS_MAX_BUCKETS_PER_REQUEST).map((batch) =>
			polisService.decide({ buckets: batch, laws, proposal }),
		),
	);
	const answers = batches.flatMap((batch) => batch.answers);

	if (answers.length === 0) {
		throw new Error(batches[0]?.error ?? NO_ANSWER);
	}

	return summarisePoll(buckets, answers);
}
