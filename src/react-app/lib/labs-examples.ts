import { SAMPLE_JWT } from "../../shared/sample-jwt";

export type ExplainSubject = "cron" | "curl" | "jwt" | "regex" | "sql";

export interface ExplainExample {
	input: string;
	label: string;
	subject: ExplainSubject;
}

export interface AskExample {
	label: string;
	request: string;
}

export const ASK_EXAMPLES: readonly AskExample[] = [
	{ label: "five uppercase v7 uuids", request: "five uppercase v7 uuids" },
	{
		label: "a strong 24 character password",
		request: "a strong 24 character password with symbols",
	},
	{
		label: "odds of 15 or more on 3d6",
		request: "what are the odds of rolling 15 or more on 3d6",
	},
	{
		label: "release notes to Jira markup",
		request:
			"turn this markdown into jira markup:\n## Release notes\n- **Fixed** the login timeout\n- Added a `--dry-run` flag\n\nSee [the changelog](https://example.com/changelog).",
	},
	{
		label: "unix timestamp to a date",
		request: "convert the unix timestamp 1700000000 into a readable date",
	},
];

export const EXPLAIN_EXAMPLES: readonly ExplainExample[] = [
	{
		input: "^(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d!@#$%^&*]{12,64}$",
		label: "Strong passphrase rule",
		subject: "regex",
	},
	{
		input: "*/15 9-17 * * 1-5",
		label: "Weekday working hours",
		subject: "cron",
	},
	{
		input: SAMPLE_JWT,
		label: "Decode a sample token",
		subject: "jwt",
	},
	{
		input:
			"curl -X POST https://api.example.com/v1/orders -H 'Accept: application/json' -H 'Content-Type: application/json' -d '{\"sku\":\"kettle-01\",\"quantity\":2}'",
		label: "Create an order",
		subject: "curl",
	},
	{
		input:
			"delete from sessions where last_seen < now() - interval '30 days' and user_id not in (select id from admins)",
		label: "Prune old sessions",
		subject: "sql",
	},
];
