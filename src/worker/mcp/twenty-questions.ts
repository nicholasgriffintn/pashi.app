import { isRecord } from "../../shared/records";
import type { AiClient } from "../ai/run";
import { overBudget } from "../services/generators/errors";
import { createDecision } from "../services/polychat/client";
import {
	readDecisionAnswers,
	readDecisionNoul,
	readDecisionScore,
	roundDecisionScore,
} from "../services/polychat/decisions";
import type { PolychatSessionEnv } from "../services/polychat/session";
import { randomChoice, randomHex, sha256 } from "../utils/generation";
import { readSealedRecord, writeSealedRecord } from "../utils/sealed-record";
import { requirePolychatPro } from "./pro-gate";
import { TWENTY_QUESTIONS_CATEGORIES } from "./twenty-questions-secrets";

export const TWENTY_QUESTIONS_MAX_QUESTIONS = 20;
export const TWENTY_QUESTIONS_QUESTION_LENGTH = { max: 200, min: 2 };
export const TWENTY_QUESTIONS_WARMTH_LEVELS = [
	"Freezing: nothing to do with the secret",
	"Cold: a different kind of thing altogether",
	"Warm: the right sort of thing",
	"Hot: circling something very close",
	"Burning: all but named it",
];

const APP_NAME = "Twenty Questions";
const GAME_PREFIX = "twenty-questions:v1:";
const GAME_TTL_SECONDS = 24 * 60 * 60;
const TOKEN_HEX_LENGTH = 64;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const MISSING_GAME = "That game has gone missing. Start a new one.";

const ANSWER_QUESTIONS = {
	answerable: {
		instructions: "Can `question` be answered with a plain yes or no?",
		type: "noul",
	},
	correct: {
		instructions:
			"Does `question` name `secret` itself? Synonyms, plurals and close spellings count; broader categories do not.",
		type: "noul",
	},
	guess: {
		instructions: "Is `question` a direct guess at one specific thing, like 'Is it a cat?'",
		type: "noul",
	},
	warmth: {
		criteria: TWENTY_QUESTIONS_WARMTH_LEVELS,
		instructions: "How close is the thinking behind `question` to `secret`?",
		type: "score",
	},
	yes: {
		instructions:
			"Answer `question` honestly about `secret`, using common knowledge. Is the true answer yes?",
		type: "noul",
	},
};

interface GameRecord {
	asked: number;
	category: string;
	over: boolean;
	owner: string;
	secret: string;
}

type AnswerKind = "guess" | "question" | "unanswerable";

function isGameRecord(value: unknown): value is GameRecord {
	return (
		isRecord(value) &&
		typeof value.asked === "number" &&
		typeof value.category === "string" &&
		typeof value.over === "boolean" &&
		typeof value.owner === "string" &&
		typeof value.secret === "string"
	);
}

function readToken(value: unknown) {
	if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) {
		throw new Error(MISSING_GAME);
	}

	return value;
}

function readQuestion(value: unknown) {
	const question = typeof value === "string" ? value.trim() : "";
	const { max, min } = TWENTY_QUESTIONS_QUESTION_LENGTH;

	if (question.length < min || question.length > max) {
		throw new Error(`Ask a question between ${min} and ${max} characters long.`);
	}

	return question;
}

async function readGame(env: PolychatSessionEnv, client: AiClient, token: string) {
	const game = await readSealedRecord(env.APPLICATIONS, GAME_PREFIX, token);

	if (!isGameRecord(game) || game.owner !== (await sha256(client.apiKey))) {
		throw new Error(MISSING_GAME);
	}

	return game;
}

function saveGame(env: PolychatSessionEnv, token: string, game: GameRecord) {
	return writeSealedRecord(env.APPLICATIONS, GAME_PREFIX, token, game, GAME_TTL_SECONDS);
}

function remaining(game: GameRecord) {
	return Math.max(0, TWENTY_QUESTIONS_MAX_QUESTIONS - game.asked);
}

function judge(response: unknown) {
	const answers = readDecisionAnswers(response);
	const isGuess = readDecisionNoul(answers.guess) >= 0.5;
	const correct = readDecisionNoul(answers.correct);
	const solved = isGuess && correct >= 0.5;
	const warmthAnswer = readDecisionScore(answers.warmth);
	const level = solved
		? TWENTY_QUESTIONS_WARMTH_LEVELS.length - 1
		: warmthAnswer
			? roundDecisionScore(warmthAnswer)
			: 0;
	const kind: AnswerKind = isGuess
		? "guess"
		: readDecisionNoul(answers.answerable) < 0.4
			? "unanswerable"
			: "question";

	return {
		kind,
		solved,
		warmth: { label: TWENTY_QUESTIONS_WARMTH_LEVELS[level]?.split(":")[0] ?? "", level },
		yes: isGuess ? correct : readDecisionNoul(answers.yes),
	};
}

export function setUpTwentyQuestions(argumentsValue: Record<string, unknown>) {
	const categoryId = typeof argumentsValue.category === "string" ? argumentsValue.category : "";
	const category = categoryId
		? TWENTY_QUESTIONS_CATEGORIES.find((entry) => entry.id === categoryId)
		: undefined;

	if (categoryId && !category) {
		throw new Error(
			`Unknown category. Choose one of ${TWENTY_QUESTIONS_CATEGORIES.map((entry) => entry.id).join(", ")}.`,
		);
	}

	return {
		categories: TWENTY_QUESTIONS_CATEGORIES.map((entry) => ({
			hint: entry.hint,
			id: entry.id,
			label: entry.label,
		})),
		game: "twenty-questions",
		maxQuestions: TWENTY_QUESTIONS_MAX_QUESTIONS,
		selectedCategory: category?.id ?? null,
	};
}

export async function startTwentyQuestions(
	argumentsValue: Record<string, unknown>,
	env: PolychatSessionEnv,
	ai: AiClient | undefined,
) {
	const category = TWENTY_QUESTIONS_CATEGORIES.find(
		(entry) => entry.id === argumentsValue.category,
	);

	if (!category) {
		throw new Error("Choose a category to play.");
	}

	const client = await requirePolychatPro(env, ai, APP_NAME, "play");
	const token = randomHex(TOKEN_HEX_LENGTH);

	await saveGame(env, token, {
		asked: 0,
		category: category.id,
		over: false,
		owner: await sha256(client.apiKey),
		secret: randomChoice(category.secrets),
	});

	return {
		category: category.id,
		maxQuestions: TWENTY_QUESTIONS_MAX_QUESTIONS,
		token,
	};
}

export async function askTwentyQuestions(
	argumentsValue: Record<string, unknown>,
	env: PolychatSessionEnv,
	ai: AiClient | undefined,
) {
	const token = readToken(argumentsValue.token);
	const question = readQuestion(argumentsValue.question);
	const client = await requirePolychatPro(env, ai, APP_NAME, "play");
	const game = await readGame(env, client, token);

	if (game.over) {
		throw new Error("That game is over. Start a new one.");
	}

	if (game.asked >= TWENTY_QUESTIONS_MAX_QUESTIONS) {
		throw overBudget(`All ${TWENTY_QUESTIONS_MAX_QUESTIONS} questions have been asked.`);
	}

	const response = await createDecision(client.env, client.apiKey, {
		questions: ANSWER_QUESTIONS,
		state: { category: game.category, question, secret: game.secret },
	});
	const answer = judge(response);
	const asked = answer.kind === "unanswerable" ? game.asked : game.asked + 1;
	const next: GameRecord = {
		...game,
		asked,
		over: answer.solved || asked >= TWENTY_QUESTIONS_MAX_QUESTIONS,
	};

	await saveGame(env, token, next);

	return {
		...answer,
		asked: next.asked,
		over: next.over,
		question,
		remaining: remaining(next),
		secret: next.over ? next.secret : null,
	};
}

export async function revealTwentyQuestions(
	argumentsValue: Record<string, unknown>,
	env: PolychatSessionEnv,
	ai: AiClient | undefined,
) {
	const token = readToken(argumentsValue.token);

	if (!ai) {
		throw new Error(MISSING_GAME);
	}

	const game = await readGame(env, ai, token);

	if (!game.over) {
		await saveGame(env, token, { ...game, over: true });
	}

	return { secret: game.secret };
}
