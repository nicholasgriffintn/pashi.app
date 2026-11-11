import type { AiClient } from "../ai/run";
import { createDecision } from "../services/polychat/client";
import {
	type DecisionScore,
	normaliseDecisionScore,
	readDecisionAnswers,
	readDecisionChoice,
	readDecisionNoul,
	readDecisionScore,
	roundDecisionScore,
} from "../services/polychat/decisions";
import { requirePolychatPro } from "../services/polychat/pro-gate";
import type { PolychatSessionEnv } from "../services/polychat/session";
import { readBase64DataUrl } from "../utils/data-url";
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
const CLIP_TYPES = ["video/mp4", "video/webm"];

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

function readDrama(answer: DecisionScore | undefined) {
	if (!answer) {
		return { label: "", level: -1, score: 0 };
	}

	const level = roundDecisionScore(answer);

	return {
		label: CHARADES_DRAMA_LEVELS[level] ?? "",
		level,
		score: normaliseDecisionScore(answer),
	};
}

function judge(response: unknown, cards: readonly string[], secretIndex: number) {
	const answers = readDecisionAnswers(response);
	const probabilities = readDecisionChoice(answers.card)?.probabilities ?? {};
	const guesses = cards
		.map((card, index) => ({ card, probability: probabilities[cardId(index)] ?? 0 }))
		.toSorted((left, right) => right.probability - left.probability);
	const secret = cards[secretIndex] ?? "";
	const secretProbability = probabilities[cardId(secretIndex)] ?? 0;
	const topGuess = guesses[0]?.card ?? "";
	const correct = topGuess === secret;
	const talking = readDecisionNoul(answers.talking);
	const caughtTalking = talking >= TALKING_THRESHOLD;
	const raw = Math.round(secretProbability * 100) + (correct ? CORRECT_BONUS : 0);

	return {
		card: secret,
		caughtTalking,
		correct,
		drama: readDrama(readDecisionScore(answers.drama)),
		dramaLevels: CHARADES_DRAMA_LEVELS,
		guesses,
		performing: readDecisionNoul(answers.performing),
		points: caughtTalking ? Math.floor(raw / 2) : raw,
		secretProbability,
		secretRank: guesses.findIndex((guess) => guess.card === secret) + 1,
		talking,
		topGuess,
	};
}

function readClip(value: unknown) {
	const clip = readBase64DataUrl(value, CLIP_TYPES);

	if (!clip) {
		throw new Error("Send the clip as a base64 video/webm or video/mp4 data URL.");
	}

	if (clip.bytes > CHARADES_CLIP_MAX_BYTES) {
		throw new Error(
			`The clip is over the ${CHARADES_CLIP_MAX_BYTES / 1024 / 1024} MiB budget. Record a shorter take.`,
		);
	}

	return clip.dataUrl;
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

	const client = await requirePolychatPro(env, ai, "Charades", "be judged");
	const response = await createDecision(
		client.env,
		client.apiKey,
		buildRequest(deck.cards, video, deck.name),
	);

	return judge(response, deck.cards, cardIndex);
}
