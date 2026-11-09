import {
	POLIS_ACTION_LABELS,
	POLIS_PARAMETERS,
	type PolisLaw,
	type PolisRule,
} from "../../../shared/polis";
import { formatParameter } from "../library/index";

function describeCohort({ cohort }: PolisRule): string {
	const parts = [
		cohort.wealth,
		cohort.employment,
		cohort.tenure,
		cohort.minAge !== null ? `${cohort.minAge}+` : null,
		cohort.maxAge !== null ? `under ${cohort.maxAge}` : null,
	].filter(Boolean);

	return parts.length > 0 ? parts.join(", ").replaceAll("_", " ") : "everyone";
}

function describeRule(rule: PolisRule): string {
	const { effect } = rule;
	const who = describeCohort(rule);

	switch (effect.kind) {
		case "payment":
			return `Pays ${who} £${effect.amountPerMonth} a month`;
		case "levy":
			return `Charges ${who} ${effect.percentOfWealthPerYear}% of wealth a year`;
		case "ban":
			return `Stops ${who} from: ${POLIS_ACTION_LABELS[effect.action].toLowerCase()}`;
		default:
			return `Makes ${who} ${effect.multiplier}× as likely to ${POLIS_ACTION_LABELS[effect.action].toLowerCase()}`;
	}
}

export function LawEffects({ law }: { law: PolisLaw }) {
	return (
		<ul className="polis-list polis-small">
			{law.changes.map(({ parameter, value }) => (
				<li key={parameter}>
					{POLIS_PARAMETERS[parameter].label}: {formatParameter(parameter, value)}
				</li>
			))}
			{law.rules.map((rule, index) => (
				<li key={index}>{describeRule(rule)}</li>
			))}
		</ul>
	);
}
