import { isRecord } from "./records";

export const POLIS_ACTIONS = [
	"buy_home",
	"buy_to_let",
	"change_job",
	"start_business",
	"have_child",
	"couple_up",
	"retrain",
	"retire_early",
	"move_away",
	"protest",
] as const;
export type PolisAction = (typeof POLIS_ACTIONS)[number];

export const POLIS_ACTION_LABELS: Record<PolisAction, string> = {
	buy_home: "Buy a home",
	buy_to_let: "Buy to let",
	change_job: "Change job",
	couple_up: "Settle down",
	have_child: "Have a child",
	move_away: "Move away",
	protest: "Protest",
	retire_early: "Retire early",
	retrain: "Retrain",
	start_business: "Start a business",
};

export interface PolisParameterDefinition {
	group: "Housing" | "Society" | "Tax" | "Welfare" | "Work";
	hint: string;
	initial: number;
	label: string;
	max: number;
	min: number;
	step: number;
	unit: "age" | "money" | "percent" | "rate";
}

export const POLIS_NO_RENT_CAP = 25;

export const POLIS_PARAMETERS = {
	incomeTaxPct: {
		group: "Tax",
		hint: "Share of pay above the allowance",
		initial: 22,
		label: "Income tax",
		max: 70,
		min: 0,
		step: 1,
		unit: "percent",
	},
	salesTaxPct: {
		group: "Tax",
		hint: "Added to everything people buy",
		initial: 10,
		label: "Sales tax",
		max: 30,
		min: 0,
		step: 1,
		unit: "percent",
	},
	corporateTaxPct: {
		group: "Tax",
		hint: "Share of company profit",
		initial: 20,
		label: "Corporate tax",
		max: 60,
		min: 0,
		step: 1,
		unit: "percent",
	},
	propertyTaxPct: {
		group: "Tax",
		hint: "Share of a home's value each year",
		initial: 0.4,
		label: "Property tax",
		max: 5,
		min: 0,
		step: 0.1,
		unit: "percent",
	},
	universalIncome: {
		group: "Welfare",
		hint: "Monthly payment to every adult",
		initial: 0,
		label: "Universal income",
		max: 2500,
		min: 0,
		step: 50,
		unit: "money",
	},
	unemploymentBenefit: {
		group: "Welfare",
		hint: "Monthly payment while out of work",
		initial: 700,
		label: "Unemployment benefit",
		max: 2500,
		min: 0,
		step: 50,
		unit: "money",
	},
	statePension: {
		group: "Welfare",
		hint: "Monthly payment in retirement",
		initial: 1000,
		label: "State pension",
		max: 3000,
		min: 0,
		step: 50,
		unit: "money",
	},
	childBenefit: {
		group: "Welfare",
		hint: "Monthly payment per child",
		initial: 75,
		label: "Child benefit",
		max: 800,
		min: 0,
		step: 25,
		unit: "money",
	},
	rentCapPct: {
		group: "Housing",
		hint: "Largest yearly rent rise. The top of the range means no cap",
		initial: POLIS_NO_RENT_CAP,
		label: "Rent cap",
		max: POLIS_NO_RENT_CAP,
		min: 0,
		step: 1,
		unit: "percent",
	},
	interestRatePct: {
		group: "Housing",
		hint: "Mortgage rate, and what savings earn a share of",
		initial: 4,
		label: "Interest rate",
		max: 20,
		min: 0,
		step: 0.25,
		unit: "percent",
	},
	publicHousingRate: {
		group: "Housing",
		hint: "Homes built each year per 1,000 people",
		initial: 2,
		label: "Public housing",
		max: 30,
		min: 0,
		step: 1,
		unit: "rate",
	},
	minimumWage: {
		group: "Work",
		hint: "Lowest monthly pay a firm can offer",
		initial: 1500,
		label: "Minimum wage",
		max: 6000,
		min: 0,
		step: 50,
		unit: "money",
	},
	publicEmployeesPct: {
		group: "Work",
		hint: "Share of workers in schools, hospitals and the town hall",
		initial: 16,
		label: "Public sector",
		max: 50,
		min: 2,
		step: 1,
		unit: "percent",
	},
	retirementAge: {
		group: "Society",
		hint: "When the state pension starts",
		initial: 67,
		label: "Retirement age",
		max: 80,
		min: 50,
		step: 1,
		unit: "age",
	},
	schoolLeavingAge: {
		group: "Society",
		hint: "More years cost more and raise skill",
		initial: 18,
		label: "School leaving age",
		max: 22,
		min: 12,
		step: 1,
		unit: "age",
	},
	immigrationRate: {
		group: "Society",
		hint: "Arrivals each year per 1,000 people",
		initial: 6,
		label: "Immigration",
		max: 50,
		min: 0,
		step: 1,
		unit: "rate",
	},
} as const satisfies Record<string, PolisParameterDefinition>;

export type PolisParameterId = keyof typeof POLIS_PARAMETERS;
export type PolisParameters = Record<PolisParameterId, number>;

export const POLIS_PARAMETER_IDS: PolisParameterId[] = [
	"incomeTaxPct",
	"salesTaxPct",
	"corporateTaxPct",
	"propertyTaxPct",
	"universalIncome",
	"unemploymentBenefit",
	"statePension",
	"childBenefit",
	"rentCapPct",
	"interestRatePct",
	"publicHousingRate",
	"minimumWage",
	"publicEmployeesPct",
	"retirementAge",
	"schoolLeavingAge",
	"immigrationRate",
];

export const POLIS_EMPLOYMENT = ["employed", "unemployed", "retired", "student"] as const;
export const POLIS_TENURE = ["owner", "renter", "landlord", "homeless"] as const;
export const POLIS_WEALTH = ["in_debt", "poor", "comfortable", "rich"] as const;
export const POLIS_AGE_BANDS = ["young", "starting_out", "midlife", "older", "senior"] as const;
export const POLIS_ASPIRATIONS = ["family", "wealth", "career", "comfort", "community"] as const;
export const POLIS_LEVELS = ["low", "medium", "high"] as const;

export type PolisEmployment = (typeof POLIS_EMPLOYMENT)[number];
export type PolisTenure = (typeof POLIS_TENURE)[number];
export type PolisWealth = (typeof POLIS_WEALTH)[number];
export type PolisAgeBand = (typeof POLIS_AGE_BANDS)[number];
export type PolisAspiration = (typeof POLIS_ASPIRATIONS)[number];
export type PolisLevel = (typeof POLIS_LEVELS)[number];

export interface PolisCohort {
	employment: PolisEmployment | null;
	maxAge: number | null;
	minAge: number | null;
	tenure: PolisTenure | null;
	wealth: PolisWealth | null;
}

export type PolisRuleEffect =
	| { action: PolisAction; kind: "ban" }
	| { action: PolisAction; kind: "nudge"; multiplier: number }
	| { amountPerMonth: number; kind: "payment" }
	| { kind: "levy"; percentOfWealthPerYear: number };

export interface PolisRule {
	cohort: PolisCohort;
	effect: PolisRuleEffect;
}

export interface PolisParameterChange {
	parameter: PolisParameterId;
	value: number;
}

export const POLIS_MAX_LAW_CHANGES = 6;
export const POLIS_MAX_LAW_RULES = 6;

export interface PolisLaw {
	changes: PolisParameterChange[];
	rules: PolisRule[];
	summary: string;
	title: string;
}

export const POLIS_SCENARIOS = [
	"recession",
	"boom",
	"epidemic",
	"factory_closures",
	"immigration_wave",
	"housing_crash",
	"flood",
	"baby_boom",
] as const;
export type PolisScenarioKind = (typeof POLIS_SCENARIOS)[number];

export interface PolisScenario {
	kind: PolisScenarioKind;
	months: number;
	severity: number;
	summary: string;
	title: string;
}

export const POLIS_DRAFT_LENGTH = { max: 400, min: 3 };

export type PolisLawDraft =
	| { law: PolisLaw; status: "enforceable" }
	| { reason: string; status: "unenforceable" };

export type PolisScenarioDraft =
	| { reason: string; status: "impossible" }
	| { scenario: PolisScenario; status: "possible" };

export interface PolisBucket {
	age: PolisAgeBand;
	aspiration: PolisAspiration;
	employment: PolisEmployment;
	housingCost: PolisLevel;
	key: number;
	mood: PolisLevel;
	tenure: PolisTenure;
	unemployment: PolisLevel;
	wealth: PolisWealth;
}

export const POLIS_MAX_BUCKETS_PER_REQUEST = 12;
export const POLIS_MAX_LAW_LINES = 16;
export const POLIS_LAW_LINE_LENGTH = 280;
export const POLIS_PROPOSAL_LENGTH = 320;

export interface PolisBucketAnswer {
	approval: number;
	inclinations: Record<PolisAction, number>;
	key: number;
	support?: number;
}

export interface PolisDecisionResponse {
	answers: PolisBucketAnswer[];
	error?: string;
	failed: number;
	inputTokens: number;
	model: string | null;
}

export const POLIS_MAX_POPULATION = 50_000;
export const POLIS_MIN_POPULATION = 200;
export const POLIS_RECORDING_VERSION = 1;

export type PolisWorldEvent =
	| {
			answers: { approval: number; inclinations: number[]; key: number }[];
			day: number;
			epoch: number;
			type: "answers";
	  }
	| { day: number; id: number; type: "repeal" }
	| { day: number; law: PolisLaw; type: "law" }
	| { day: number; scenario: PolisScenario; type: "scenario" }
	| { day: number; type: "parameters"; values: Partial<PolisParameters> };

export interface PolisRecording {
	day: number;
	id: string;
	log: PolisWorldEvent[];
	name: string;
	population: number;
	savedAt: number;
	seed: number;
	version: typeof POLIS_RECORDING_VERSION;
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
	return values.some((item) => item === value);
}

function isIntegerIn(value: unknown, min: number, max: number): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function isNumberIn(value: unknown, min: number, max: number): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isProbability(value: unknown): value is number {
	return isNumberIn(value, 0, 1);
}

function isText(value: unknown, max: number): value is string {
	return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
	return Object.keys(value).every((key) => keys.includes(key));
}

export function isPolisParameterId(value: unknown): value is PolisParameterId {
	return isOneOf(POLIS_PARAMETER_IDS, value);
}

function isNullableAge(value: unknown) {
	return value === null || isIntegerIn(value, 0, 110);
}

export function isPolisCohort(value: unknown): value is PolisCohort {
	return (
		isRecord(value) &&
		hasOnlyKeys(value, ["employment", "maxAge", "minAge", "tenure", "wealth"]) &&
		isNullableAge(value.minAge) &&
		isNullableAge(value.maxAge) &&
		(value.employment === null || isOneOf(POLIS_EMPLOYMENT, value.employment)) &&
		(value.tenure === null || isOneOf(POLIS_TENURE, value.tenure)) &&
		(value.wealth === null || isOneOf(POLIS_WEALTH, value.wealth))
	);
}

export function isPolisRuleEffect(value: unknown): value is PolisRuleEffect {
	if (!isRecord(value)) {
		return false;
	}

	switch (value.kind) {
		case "payment":
			return (
				hasOnlyKeys(value, ["kind", "amountPerMonth"]) && isNumberIn(value.amountPerMonth, 0, 5000)
			);
		case "levy":
			return (
				hasOnlyKeys(value, ["kind", "percentOfWealthPerYear"]) &&
				isNumberIn(value.percentOfWealthPerYear, 0, 50)
			);
		case "ban":
			return hasOnlyKeys(value, ["kind", "action"]) && isOneOf(POLIS_ACTIONS, value.action);
		case "nudge":
			return (
				hasOnlyKeys(value, ["kind", "action", "multiplier"]) &&
				isOneOf(POLIS_ACTIONS, value.action) &&
				isNumberIn(value.multiplier, 0.1, 5)
			);
		default:
			return false;
	}
}

export function isPolisRule(value: unknown): value is PolisRule {
	return (
		isRecord(value) &&
		hasOnlyKeys(value, ["cohort", "effect"]) &&
		isPolisCohort(value.cohort) &&
		isPolisRuleEffect(value.effect)
	);
}

export function isPolisParameterChange(value: unknown): value is PolisParameterChange {
	return (
		isRecord(value) &&
		hasOnlyKeys(value, ["parameter", "value"]) &&
		isPolisParameterId(value.parameter) &&
		isNumberIn(
			value.value,
			POLIS_PARAMETERS[value.parameter].min,
			POLIS_PARAMETERS[value.parameter].max,
		)
	);
}

export function isPolisLaw(value: unknown): value is PolisLaw {
	return (
		isRecord(value) &&
		hasOnlyKeys(value, ["changes", "rules", "summary", "title"]) &&
		isText(value.title, 80) &&
		isText(value.summary, 240) &&
		Array.isArray(value.changes) &&
		value.changes.length <= POLIS_MAX_LAW_CHANGES &&
		value.changes.every(isPolisParameterChange) &&
		Array.isArray(value.rules) &&
		value.rules.length <= POLIS_MAX_LAW_RULES &&
		value.rules.every(isPolisRule)
	);
}

export function isPolisScenario(value: unknown): value is PolisScenario {
	return (
		isRecord(value) &&
		hasOnlyKeys(value, ["kind", "months", "severity", "summary", "title"]) &&
		isOneOf(POLIS_SCENARIOS, value.kind) &&
		isText(value.title, 80) &&
		isText(value.summary, 240) &&
		isProbability(value.severity) &&
		isIntegerIn(value.months, 1, 60)
	);
}

export function isPolisBucket(value: unknown): value is PolisBucket {
	return (
		isRecord(value) &&
		hasOnlyKeys(value, [
			"age",
			"aspiration",
			"employment",
			"housingCost",
			"key",
			"mood",
			"tenure",
			"unemployment",
			"wealth",
		]) &&
		isIntegerIn(value.key, 0, Number.MAX_SAFE_INTEGER) &&
		isOneOf(POLIS_AGE_BANDS, value.age) &&
		isOneOf(POLIS_WEALTH, value.wealth) &&
		isOneOf(POLIS_EMPLOYMENT, value.employment) &&
		isOneOf(POLIS_TENURE, value.tenure) &&
		isOneOf(POLIS_ASPIRATIONS, value.aspiration) &&
		isOneOf(POLIS_LEVELS, value.unemployment) &&
		isOneOf(POLIS_LEVELS, value.housingCost) &&
		isOneOf(POLIS_LEVELS, value.mood)
	);
}

export function isPolisLawDraft(value: unknown): value is PolisLawDraft {
	return (
		isRecord(value) &&
		((value.status === "enforceable" && isPolisLaw(value.law)) ||
			(value.status === "unenforceable" && isText(value.reason, 240)))
	);
}

export function isPolisScenarioDraft(value: unknown): value is PolisScenarioDraft {
	return (
		isRecord(value) &&
		((value.status === "possible" && isPolisScenario(value.scenario)) ||
			(value.status === "impossible" && isText(value.reason, 240)))
	);
}

function isBucketAnswer(value: unknown): value is PolisBucketAnswer {
	return (
		isRecord(value) &&
		isIntegerIn(value.key, 0, Number.MAX_SAFE_INTEGER) &&
		isProbability(value.approval) &&
		isRecord(value.inclinations) &&
		POLIS_ACTIONS.every(
			(action) => isRecord(value.inclinations) && isProbability(value.inclinations[action]),
		) &&
		(value.support === undefined || isProbability(value.support))
	);
}

export function isPolisDecisionResponse(value: unknown): value is PolisDecisionResponse {
	return (
		isRecord(value) &&
		Array.isArray(value.answers) &&
		value.answers.every(isBucketAnswer) &&
		isIntegerIn(value.failed, 0, Number.MAX_SAFE_INTEGER) &&
		(value.model === null || typeof value.model === "string") &&
		isIntegerIn(value.inputTokens, 0, Number.MAX_SAFE_INTEGER)
	);
}

function isPartialParameters(value: unknown): value is Partial<PolisParameters> {
	return (
		isRecord(value) &&
		Object.entries(value).every(
			([key, item]) => isPolisParameterId(key) && typeof item === "number",
		)
	);
}

function isRecordedAnswer(value: unknown) {
	return (
		isRecord(value) &&
		isIntegerIn(value.key, 0, Number.MAX_SAFE_INTEGER) &&
		isProbability(value.approval) &&
		Array.isArray(value.inclinations) &&
		value.inclinations.length === POLIS_ACTIONS.length &&
		value.inclinations.every(isProbability)
	);
}

export function isPolisWorldEvent(value: unknown): value is PolisWorldEvent {
	if (!isRecord(value) || !isIntegerIn(value.day, 0, Number.MAX_SAFE_INTEGER)) {
		return false;
	}

	switch (value.type) {
		case "law":
			return isPolisLaw(value.law);
		case "repeal":
			return Number.isInteger(value.id);
		case "parameters":
			return isPartialParameters(value.values);
		case "scenario":
			return isPolisScenario(value.scenario);
		case "answers":
			return (
				isIntegerIn(value.epoch, 0, Number.MAX_SAFE_INTEGER) &&
				Array.isArray(value.answers) &&
				value.answers.every(isRecordedAnswer)
			);
		default:
			return false;
	}
}

export function isPolisRecording(value: unknown): value is PolisRecording {
	return (
		isRecord(value) &&
		value.version === POLIS_RECORDING_VERSION &&
		isText(value.id, 64) &&
		isText(value.name, 60) &&
		isIntegerIn(value.population, POLIS_MIN_POPULATION, POLIS_MAX_POPULATION) &&
		Number.isInteger(value.seed) &&
		isIntegerIn(value.day, 0, Number.MAX_SAFE_INTEGER) &&
		isIntegerIn(value.savedAt, 0, Number.MAX_SAFE_INTEGER) &&
		Array.isArray(value.log) &&
		value.log.every(isPolisWorldEvent)
	);
}

export const POLIS_SHARE_MAX_BYTES = 12 * 1024 * 1024;
export const POLIS_SHARE_TOKEN_PATTERN = /^[a-f0-9]{32}$/;
