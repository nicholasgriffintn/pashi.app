export const DECIDE_QUESTION_TYPES = ["yesno", "choice", "score"] as const;
export type DecideQuestionType = (typeof DECIDE_QUESTION_TYPES)[number];

export const DECIDE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const DECIDE_ID_PATTERN = "^[a-z0-9]+(?:-[a-z0-9]+)*$";

export const DECIDE_LIMITS = {
	idLength: 40,
	imageBytes: 1024 * 1024,
	labelLength: 80,
	maxLevels: 7,
	maxOptions: 8,
	maxQuestions: 8,
	minLevels: 2,
	minOptions: 2,
	minQuestions: 1,
	promptLength: 300,
	subjectLength: 4000,
} as const;

export interface DecideOption {
	id: string;
	label: string;
}

export type DecideQuestion =
	| { id: string; prompt: string; type: "yesno" }
	| { id: string; options: DecideOption[]; prompt: string; type: "choice" }
	| { id: string; levels: string[]; prompt: string; type: "score" };

export interface DecideRequest {
	image?: string;
	questions: DecideQuestion[];
	subject: string;
}

export type DecideAnswer =
	| { id: string; probability: number; type: "yesno" }
	| {
			choice: string;
			confidence: number;
			distribution: Record<string, number>;
			id: string;
			type: "choice";
	  }
	| {
			id: string;
			level: string;
			levelIndex: number;
			normalised: number;
			score: number;
			type: "score";
	  };

export interface DecideResponse {
	answers: DecideAnswer[];
}
