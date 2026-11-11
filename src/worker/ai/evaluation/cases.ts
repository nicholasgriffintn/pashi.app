export interface RouteCase {
	acceptableToolIds: readonly string[];
	expectedFields?: Readonly<Record<string, string>>;
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
		expectedFields: { count: "5", format: "v7", outputFormat: "uppercase" },
		expectedToolId: "uuid",
		request: "five uppercase v7 uuids",
	},
	{
		acceptableToolIds: ["password", "passphrase"],
		expectedFields: { length: "24", symbols: "true" },
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
		expectedFields: { comparison: ">=", notation: "3d6", target: "15" },
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
	{
		input:
			"curl -X POST -H 'Content-Type: application/json' -d '{\"name\":\"pashi\"}' https://api.example.com/v1/things",
		mustMention: ["POST", "api.example.com"],
		subject: "curl",
	},
	{
		input:
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTQyIiwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjE3MDQwNzA4MDB9.c2lnbmF0dXJl",
		mustMention: ["HS256", "expired"],
		subject: "jwt",
	},
];
