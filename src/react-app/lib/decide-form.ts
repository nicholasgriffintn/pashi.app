import {
	DECIDE_LIMITS,
	type DecideQuestion,
	type DecideQuestionType,
	type DecideRequest,
} from "../../shared/decide";
import type { DecideExample, DecideExampleQuestion } from "./decide-examples";

export type DecideEntryList = "levels" | "options";

export interface DecideDraftEntry {
	key: string;
	label: string;
}

export interface DecideDraftQuestion {
	key: string;
	levels: DecideDraftEntry[];
	options: DecideDraftEntry[];
	prompt: string;
	type: DecideQuestionType;
}

export interface DecideImage {
	dataUrl: string;
	name: string;
}

export interface DecideFormState {
	image: DecideImage | null;
	nextKey: number;
	questions: DecideDraftQuestion[];
	subject: string;
}

export type DecideFormAction =
	| { example: DecideExample; type: "load" }
	| { subject: string; type: "subject" }
	| { image: DecideImage | null; type: "image" }
	| { type: "addQuestion" }
	| { question: string; type: "removeQuestion" }
	| { prompt: string; question: string; type: "prompt" }
	| { question: string; questionType: DecideQuestionType; type: "questionType" }
	| { list: DecideEntryList; question: string; type: "addEntry" }
	| { entry: string; list: DecideEntryList; question: string; type: "removeEntry" }
	| { entry: string; label: string; list: DecideEntryList; question: string; type: "entry" };

const DEFAULT_LEVELS = ["Low", "Medium", "High"];
const LIST_LIMITS: Record<DecideEntryList, { max: number; min: number }> = {
	levels: { max: DECIDE_LIMITS.maxLevels, min: DECIDE_LIMITS.minLevels },
	options: { max: DECIDE_LIMITS.maxOptions, min: DECIDE_LIMITS.minOptions },
};

interface KeyCounter {
	next: number;
}

function takeKey(counter: KeyCounter, prefix: string) {
	counter.next += 1;

	return `${prefix}${counter.next}`;
}

function draftEntries(counter: KeyCounter, prefix: string, labels: readonly string[]) {
	return labels.map((label) => ({ key: takeKey(counter, prefix), label }));
}

function draftQuestion(
	counter: KeyCounter,
	source: DecideExampleQuestion | undefined,
): DecideDraftQuestion {
	return {
		key: takeKey(counter, "q"),
		levels: draftEntries(counter, "l", source?.type === "score" ? source.levels : DEFAULT_LEVELS),
		options: draftEntries(counter, "o", source?.type === "choice" ? source.options : ["", ""]),
		prompt: source?.prompt ?? "",
		type: source?.type ?? "yesno",
	};
}

export function formFromExample(example: DecideExample): DecideFormState {
	const counter = { next: 0 };
	const questions = example.questions.map((question) => draftQuestion(counter, question));

	return { image: null, nextKey: counter.next, questions, subject: example.subject };
}

function updateQuestion(
	state: DecideFormState,
	key: string,
	update: (question: DecideDraftQuestion) => DecideDraftQuestion,
): DecideFormState {
	return {
		...state,
		questions: state.questions.map((question) =>
			question.key === key ? update(question) : question,
		),
	};
}

function updateEntries(
	state: DecideFormState,
	{ list, question }: { list: DecideEntryList; question: string },
	update: (entries: DecideDraftEntry[]) => DecideDraftEntry[],
) {
	return updateQuestion(state, question, (draft) =>
		list === "levels"
			? { ...draft, levels: update(draft.levels) }
			: { ...draft, options: update(draft.options) },
	);
}

export function decideFormReducer(
	state: DecideFormState,
	action: DecideFormAction,
): DecideFormState {
	if (action.type === "load") {
		return formFromExample(action.example);
	}

	if (action.type === "subject") {
		return { ...state, subject: action.subject };
	}

	if (action.type === "image") {
		return { ...state, image: action.image };
	}

	if (action.type === "addQuestion") {
		if (state.questions.length >= DECIDE_LIMITS.maxQuestions) {
			return state;
		}

		const counter = { next: state.nextKey };
		const question = draftQuestion(counter, undefined);

		return { ...state, nextKey: counter.next, questions: [...state.questions, question] };
	}

	if (action.type === "removeQuestion") {
		return state.questions.length > DECIDE_LIMITS.minQuestions
			? {
					...state,
					questions: state.questions.filter((question) => question.key !== action.question),
				}
			: state;
	}

	if (action.type === "prompt") {
		return updateQuestion(state, action.question, (question) => ({
			...question,
			prompt: action.prompt,
		}));
	}

	if (action.type === "questionType") {
		return updateQuestion(state, action.question, (question) => ({
			...question,
			type: action.questionType,
		}));
	}

	if (action.type === "addEntry") {
		const counter = { next: state.nextKey };
		const key = takeKey(counter, action.list === "levels" ? "l" : "o");
		const next = updateEntries(state, action, (entries) =>
			entries.length >= LIST_LIMITS[action.list].max ? entries : [...entries, { key, label: "" }],
		);

		return { ...next, nextKey: counter.next };
	}

	if (action.type === "removeEntry") {
		return updateEntries(state, action, (entries) =>
			entries.length <= LIST_LIMITS[action.list].min
				? entries
				: entries.filter((entry) => entry.key !== action.entry),
		);
	}

	return updateEntries(state, action, (entries) =>
		entries.map((entry) =>
			entry.key === action.entry ? { ...entry, label: action.label } : entry,
		),
	);
}

export function entryLimits(list: DecideEntryList) {
	return LIST_LIMITS[list];
}

function hasDistinctLabels(entries: readonly DecideDraftEntry[]) {
	const labels = entries.map((entry) => entry.label.trim().toLowerCase());

	return labels.every(Boolean) && new Set(labels).size === labels.length;
}

export function findFormProblem(state: DecideFormState) {
	const subject = state.subject.trim();

	if (!subject) {
		return "Add the text you want judged.";
	}

	if (subject.length > DECIDE_LIMITS.subjectLength) {
		return `Keep the text to ${DECIDE_LIMITS.subjectLength} characters or fewer.`;
	}

	for (const [index, question] of state.questions.entries()) {
		if (!question.prompt.trim()) {
			return `Question ${index + 1} needs a prompt.`;
		}

		if (question.type === "choice" && !hasDistinctLabels(question.options)) {
			return `Give every option in question ${index + 1} a different name.`;
		}

		if (question.type === "score" && !hasDistinctLabels(question.levels)) {
			return `Give every level in question ${index + 1} a different name.`;
		}
	}

	return undefined;
}

function toQuestion(question: DecideDraftQuestion): DecideQuestion {
	const prompt = question.prompt.trim();

	if (question.type === "choice") {
		return {
			id: question.key,
			options: question.options.map((entry) => ({ id: entry.key, label: entry.label.trim() })),
			prompt,
			type: "choice",
		};
	}

	if (question.type === "score") {
		return {
			id: question.key,
			levels: question.levels.map((entry) => entry.label.trim()),
			prompt,
			type: "score",
		};
	}

	return { id: question.key, prompt, type: "yesno" };
}

export function toDecideRequest(state: DecideFormState): DecideRequest {
	const request = { questions: state.questions.map(toQuestion), subject: state.subject.trim() };

	return state.image ? { ...request, image: state.image.dataUrl } : request;
}
