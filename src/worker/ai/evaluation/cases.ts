export interface RouteCase {
	acceptableToolIds: readonly string[];
	expectedToolId: string;
	request: string;
}

export interface ExplainCase {
	input: string;
	mustMention: readonly string[];
	subject: "cron" | "curl" | "jwt" | "regex" | "sql";
}

export const ROUTE_CASES: readonly RouteCase[] = [
	{
		acceptableToolIds: ["uuid"],
		expectedToolId: "uuid",
		request: "five uppercase v7 uuids",
	},
	{
		acceptableToolIds: ["password", "passphrase"],
		expectedToolId: "password",
		request: "a strong 24 character password with symbols",
	},
	{
		acceptableToolIds: ["markdown-to-jira"],
		expectedToolId: "markdown-to-jira",
		request: "turn this markdown into jira markup",
	},
	{
		acceptableToolIds: ["dice-probability", "dice"],
		expectedToolId: "dice-probability",
		request: "what are the odds of rolling 15 or more on 3d6",
	},
	{
		acceptableToolIds: ["qr"],
		expectedToolId: "qr",
		request: "a qr code for my website",
	},
	{
		acceptableToolIds: ["colour", "palette"],
		expectedToolId: "palette",
		request: "a harmonious colour palette for a dark theme",
	},
	{
		acceptableToolIds: ["timestamp-transform"],
		expectedToolId: "timestamp-transform",
		request: "convert this unix timestamp to something readable",
	},
	{
		acceptableToolIds: ["json-transform", "developer-text"],
		expectedToolId: "json-transform",
		request: "pretty print this minified json",
	},
	{
		acceptableToolIds: ["lorem"],
		expectedToolId: "lorem",
		request: "three paragraphs of placeholder copy",
	},
	{
		acceptableToolIds: ["jwt-token", "developer-inspect"],
		expectedToolId: "jwt-token",
		request: "sign me a test jwt",
	},
];

export const EXPLAIN_CASES: readonly ExplainCase[] = [
	{
		input: "*/15 9-17 * * 1-5",
		mustMention: ["15", "minute"],
		subject: "cron",
	},
	{
		input: "^\\+?[1-9]\\d{1,14}$",
		mustMention: ["digit"],
		subject: "regex",
	},
	{
		input: "delete from sessions where last_seen < now() - interval '30 days'",
		mustMention: ["sessions"],
		subject: "sql",
	},
];
