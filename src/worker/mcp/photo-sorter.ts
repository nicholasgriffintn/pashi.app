import { isRecord } from "../../shared/records";
import type { AiClient } from "../ai/run";
import { overBudget } from "../services/generators/errors";
import { createDecision } from "../services/polychat/client";
import {
	readDecisionAnswers,
	readDecisionChoice,
	readDecisionNoul,
	readDecisionScore,
	roundDecisionScore,
} from "../services/polychat/decisions";
import type { PolychatSessionEnv } from "../services/polychat/session";
import { readBase64DataUrl } from "../utils/data-url";
import { requirePolychatPro } from "./pro-gate";

export interface PhotoPile {
	description: string;
	id: string;
	label: string;
}

export const PHOTO_SORTER_LIMITS = {
	descriptionLength: 200,
	labelLength: 60,
	maxBytes: 1024 * 1024,
	maxDimension: 768,
	maxPhotos: 80,
	maxPiles: 12,
	minPiles: 2,
	parallelSorts: 3,
};

export const PHOTO_SORTER_PRESETS: readonly { name: string; piles: Omit<PhotoPile, "id">[] }[] = [
	{
		name: "Camera roll tidy",
		piles: [
			{ description: "Photos where people are the subject", label: "People" },
			{ description: "Animals are the subject", label: "Pets and animals" },
			{ description: "Meals, dishes, drinks", label: "Food and drink" },
			{ description: "Landscapes, cities, buildings, travel", label: "Places" },
			{ description: "Receipts, letters, forms, whiteboards, notes", label: "Documents" },
			{ description: "Screen captures of apps, sites or messages", label: "Screenshots" },
		],
	},
	{
		name: "Listing photos",
		piles: [
			{ description: "Outside of a building or garden", label: "Exterior" },
			{ description: "Living rooms, dining rooms, hallways", label: "Living spaces" },
			{ description: "Kitchens and utility rooms", label: "Kitchen" },
			{ description: "Bedrooms and dressing rooms", label: "Bedrooms" },
			{ description: "Bathrooms, showers, toilets", label: "Bathrooms" },
		],
	},
	{
		name: "Mood board",
		piles: [
			{ description: "Quiet, soft, restful", label: "Calm" },
			{ description: "Strong colour, contrast, energy", label: "Bold" },
			{ description: "Retro, faded, sentimental", label: "Nostalgic" },
			{ description: "Silly, whimsical, fun", label: "Playful" },
		],
	},
];

export const PHOTO_SORTER_FLAGS = {
	blurry: { label: "Blurry", question: "Blurry, dark or badly exposed" },
	face: { label: "Face", question: "Shows a person's face" },
	screenshot: { label: "Screenshot", question: "Is a screenshot rather than a photograph" },
	text: { label: "Text", question: "Contains readable text" },
};

export const PHOTO_SORTER_KEEPER_LEVELS = ["Bin it", "Meh", "Keep", "Frame it"];

const APP_NAME = "Photo Sorter";
const NO_PILE = "none";
const FLAG_THRESHOLD = 0.6;
const CONFIDENT_ENOUGH = 0.5;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PILE_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

function readPile(value: unknown): PhotoPile {
	const { descriptionLength, labelLength } = PHOTO_SORTER_LIMITS;
	const id = isRecord(value) && typeof value.id === "string" ? value.id : "";
	const label = isRecord(value) && typeof value.label === "string" ? value.label.trim() : "";
	const description =
		isRecord(value) && typeof value.description === "string" ? value.description.trim() : "";

	if (!PILE_ID_PATTERN.test(id) || id === NO_PILE) {
		throw new Error("Each pile needs a short id of letters, numbers, dashes or underscores.");
	}

	if (!label || label.length > labelLength) {
		throw new Error(`Name every pile, in ${labelLength} characters or fewer.`);
	}

	if (description.length > descriptionLength) {
		throw new Error(`Keep pile descriptions to ${descriptionLength} characters.`);
	}

	return { description, id, label };
}

function readPiles(value: unknown) {
	const { maxPiles, minPiles } = PHOTO_SORTER_LIMITS;

	if (!Array.isArray(value) || value.length < minPiles) {
		throw new Error(`Make at least ${minPiles} piles to sort into.`);
	}

	if (value.length > maxPiles) {
		throw overBudget(`Sort into ${maxPiles} piles or fewer.`);
	}

	const piles = value.map(readPile);

	if (new Set(piles.map((pile) => pile.id)).size !== piles.length) {
		throw new Error("Pile ids must be unique.");
	}

	return piles;
}

function readImage(value: unknown) {
	const image = readBase64DataUrl(value, IMAGE_TYPES);

	if (!image) {
		throw new Error("Send the photo as a base64 JPEG, PNG or WebP data URL.");
	}

	if (image.bytes > PHOTO_SORTER_LIMITS.maxBytes) {
		throw overBudget(
			`The photo is over the ${PHOTO_SORTER_LIMITS.maxBytes / 1024 / 1024} MiB budget. Shrink it before sorting.`,
		);
	}

	return image.dataUrl;
}

function buildRequest(image: string, piles: readonly PhotoPile[]) {
	const criteria = Object.fromEntries(
		piles.map((pile) => [
			pile.id,
			pile.description ? `${pile.label}: ${pile.description}` : pile.label,
		]),
	);
	const flags = Object.fromEntries(
		Object.entries(PHOTO_SORTER_FLAGS).map(([flag, { question }]) => [
			flag,
			{ instructions: `${question}?`, type: "noul" },
		]),
	);

	return {
		images: [image],
		questions: {
			keeper: {
				criteria: PHOTO_SORTER_KEEPER_LEVELS,
				instructions: "How worth keeping is this image as a picture?",
				type: "score",
			},
			pile: {
				criteria: { ...criteria, [NO_PILE]: "None of these piles fits" },
				instructions: "Which pile does this image belong in?",
				type: "choice",
			},
			...flags,
		},
		state: "Sort an image into one of the user's piles.",
	};
}

function readSort(response: unknown) {
	const answers = readDecisionAnswers(response);
	const choice = readDecisionChoice(answers.pile);
	const keeper = readDecisionScore(answers.keeper);
	const confidence = choice?.confidence ?? 0;
	const bestGuess = choice?.choice || NO_PILE;

	return {
		bestGuess,
		confidence,
		flags: Object.keys(PHOTO_SORTER_FLAGS).filter(
			(flag) => readDecisionNoul(answers[flag]) >= FLAG_THRESHOLD,
		),
		keeper: keeper ? (PHOTO_SORTER_KEEPER_LEVELS[roundDecisionScore(keeper)] ?? "") : "",
		pileId: bestGuess !== NO_PILE && confidence >= CONFIDENT_ENOUGH ? bestGuess : null,
		probabilities: choice?.probabilities ?? {},
	};
}

export function setUpPhotoSorter() {
	return {
		app: "photo-sorter",
		maxPhotos: PHOTO_SORTER_LIMITS.maxPhotos,
		presets: PHOTO_SORTER_PRESETS.map((preset) => preset.name),
	};
}

export async function sortPhoto(
	argumentsValue: Record<string, unknown>,
	env: PolychatSessionEnv,
	ai: AiClient | undefined,
) {
	const piles = readPiles(argumentsValue.piles);
	const image = readImage(argumentsValue.image);
	const client = await requirePolychatPro(env, ai, APP_NAME, "sort photos");
	const response = await createDecision(client.env, client.apiKey, buildRequest(image, piles));

	return readSort(response);
}
