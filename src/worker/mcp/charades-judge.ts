import { isRecord } from "../../shared/records";
import type { AiClient } from "../ai/run";
import { createDecision } from "../services/polychat/client";
import { isPolychatPro, type PolychatSessionEnv } from "../services/polychat/session";
import { CHARADES_DECKS } from "./charades";

export const CHARADES_DRAMA_LEVELS = [
	"Barely moving",
	"Polite",
	"Committed",
	"Theatrical",
	"Award-worthy",
];
export const CHARADES_CLIP_MAX_BYTES = 6 * 1024 * 1024;

const TALKING_THRESHOLD = 0.6;
const CORRECT_BONUS = 25;
const CLIP_PATTERN = /^data:(video\/(?:mp4|webm));base64,([A-Za-z0-9+/]+={0,2})$/;

interface ChoiceAnswer {
	probabilities: Record<string, number>;
}

interface ScoreAnswer {
	legend: Record<string, unknown>;
	score: number;
}

const cardId = (index: number) => `c${index}`;

function buildRequest(cards: readonly string[], video: string, deckName: string) {
	return {
		questions: {
			card: {
				criteria: Object.fromEntries(cards.map((card, index) => [cardId(index), card])),
				instructions:
					"The person in the video is acting out one card from this charades deck. Which card are they performing?",
				type: "choice",
			},
			drama: {
				criteria: CHARADES_DRAMA_LEVELS,
				instructions: "How much energy and commitment does the performance show?",
				type: "score",
			},
			performing: {
				instructions: "Is a person visibly acting something out on camera?",
				type: "noul",
			},
			talking: {
				instructions:
					"Does the performer say real words out loud? Sound effects, humming, clapping and animal noises do not count.",
				type: "noul",
			},
		},
		state: {
			deck: deckName,
			game: "charades",
			rules: "Players act out the card. Sound effects are allowed, but speaking words is cheating.",
		},
		videos: [video],
	};
}

function readAnswers(response: unknown): Record<string, unknown> {
	if (!isRecord(response) || !isRecord(response.answers)) {
		throw new Error("The audience gave an answer Pashi could not read.");
	}

	return response.answers;
}

function readChoice(answer: unknown): ChoiceAnswer | undefined {
	return isRecord(answer) && answer.type === "choice" && isRecord(answer.probabilities)
		? {
				probabilities: Object.fromEntries(
					Object.entries(answer.probabilities).filter(
						(entry): entry is [string, number] => typeof entry[1] === "number",
					),
				),
			}
		: undefined;
}

function readNoul(answer: unknown) {
	return isRecord(answer) && answer.type === "noul" && typeof answer.noul === "number"
		? answer.noul
		: 0;
}

function readScore(answer: unknown): ScoreAnswer | undefined {
	return isRecord(answer) &&
		answer.type === "score" &&
		typeof answer.score === "number" &&
		isRecord(answer.legend)
		? { legend: answer.legend, score: answer.score }
		: undefined;
}

function readDrama(answer: ScoreAnswer | undefined) {
	if (!answer) {
		return { label: "", level: -1, score: 0 };
	}

	const topLevel = Object.keys(answer.legend).length - 1;
	const level = Math.min(topLevel, Math.max(0, Math.round(answer.score)));

	return {
		label: CHARADES_DRAMA_LEVELS[level] ?? "",
		level,
		score: topLevel > 0 ? Math.min(1, Math.max(0, answer.score / topLevel)) : 0,
	};
}

function judge(response: unknown, cards: readonly string[], secretIndex: number) {
	const answers = readAnswers(response);
	const probabilities = readChoice(answers.card)?.probabilities ?? {};
	const guesses = cards
		.map((card, index) => ({ card, probability: probabilities[cardId(index)] ?? 0 }))
		.toSorted((left, right) => right.probability - left.probability);
	const secret = cards[secretIndex] ?? "";
	const secretProbability = probabilities[cardId(secretIndex)] ?? 0;
	const topGuess = guesses[0]?.card ?? "";
	const correct = topGuess === secret;
	const talking = readNoul(answers.talking);
	const caughtTalking = talking >= TALKING_THRESHOLD;
	const raw = Math.round(secretProbability * 100) + (correct ? CORRECT_BONUS : 0);

	return {
		card: secret,
		caughtTalking,
		correct,
		drama: readDrama(readScore(answers.drama)),
		dramaLevels: CHARADES_DRAMA_LEVELS,
		guesses,
		performing: readNoul(answers.performing),
		points: caughtTalking ? Math.floor(raw / 2) : raw,
		secretProbability,
		secretRank: guesses.findIndex((guess) => guess.card === secret) + 1,
		talking,
		topGuess,
	};
}

function readClip(value: unknown) {
	const match = typeof value === "string" ? CLIP_PATTERN.exec(value) : null;

	if (!match) {
		throw new Error("Send the clip as a base64 video/webm or video/mp4 data URL.");
	}

	const padding = match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0;
	const bytes = Math.floor((match[2].length * 3) / 4) - padding;

	if (bytes > CHARADES_CLIP_MAX_BYTES) {
		throw new Error(
			`The clip is over the ${CHARADES_CLIP_MAX_BYTES / 1024 / 1024} MiB budget. Record a shorter take.`,
		);
	}

	return match[0];
}

export async function judgeCharadesClip(
	argumentsValue: Record<string, unknown>,
	env: PolychatSessionEnv,
	ai: AiClient | undefined,
) {
	const deck = CHARADES_DECKS.find((entry) => entry.id === argumentsValue.deck);
	const cardIndex = argumentsValue.card;

	if (!deck) {
		throw new Error("Choose a deck before acting.");
	}

	if (typeof cardIndex !== "number" || !Number.isInteger(cardIndex) || !deck.cards[cardIndex]) {
		throw new Error("That card is not in the deck.");
	}

	const video = readClip(argumentsValue.video);

	if (!ai) {
		throw new Error(
			"The audience runs on Polychat. Connect Pashi through your Polychat link to be judged.",
		);
	}

	if (!(await isPolychatPro(env, ai.apiKey))) {
		throw new Error("Charades is a Polychat Pro app. Upgrade your Polychat plan to be judged.");
	}

	const response = await createDecision(
		ai.env,
		ai.apiKey,
		buildRequest(deck.cards, video, deck.name),
	);

	return judge(response, deck.cards, cardIndex);
}
