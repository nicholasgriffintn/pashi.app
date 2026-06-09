import assert from "node:assert/strict";
import { test } from "node:test";

import { jiraToMarkdown, markdownToJira } from "./atlassian-markup.ts";

test("converts markdown structure to jira wiki markup", () => {
	const input = [
		"## Release notes",
		"",
		"- **Fixed** auth",
		"  - Added `copy` action",
		"1. Ship it",
		"> Keep this visible",
		"[Pashi](https://pashi.app)",
	].join("\n");

	assert.equal(
		markdownToJira(input),
		[
			"h2. Release notes",
			"",
			"* *Fixed* auth",
			"** Added {{copy}} action",
			"# Ship it",
			"bq. Keep this visible",
			"[Pashi|https://pashi.app]",
		].join("\n"),
	);
});

test("converts jira wiki markup to markdown", () => {
	const input = [
		"h3. Release notes",
		"",
		"* *Fixed* auth",
		"** Added {{copy}} action",
		"# Ship it",
		"bq. Keep this visible",
		"[Pashi|https://pashi.app]",
	].join("\n");

	assert.equal(
		jiraToMarkdown(input),
		[
			"### Release notes",
			"",
			"- **Fixed** auth",
			"  - Added `copy` action",
			"1. Ship it",
			"> Keep this visible",
			"[Pashi](https://pashi.app)",
		].join("\n"),
	);
});

test("keeps code block contents untouched", () => {
	const input = [
		"```ts",
		"const value = **not bold**;",
		"```",
	].join("\n");

	assert.equal(
		markdownToJira(input),
		[
			"{code:language=ts}",
			"const value = **not bold**;",
			"{code}",
		].join("\n"),
	);
});

test("does not let converted bold become italic in the same markdown pass", () => {
	assert.equal(markdownToJira("**bold** and *italic*"), "*bold* and _italic_");
});

test("converts markdown tables to jira tables", () => {
	const input = [
		"| Name | Status |",
		"| --- | --- |",
		"| Pashi | **ready** |",
	].join("\n");

	assert.equal(
		markdownToJira(input),
		[
			"|| Name || Status ||",
			"| Pashi | *ready* |",
		].join("\n"),
	);
});

test("converts jira tables to markdown tables", () => {
	const input = [
		"|| Name || Status ||",
		"| Pashi | *ready* |",
	].join("\n");

	assert.equal(
		jiraToMarkdown(input),
		[
			"| Name | Status |",
			"| --- | --- |",
			"| Pashi | **ready** |",
		].join("\n"),
	);
});

test("converts jira code languages and strikethrough", () => {
	assert.equal(
		jiraToMarkdown("{code:language=ts}\nconst value = -old-;\n{code}"),
		"```ts\nconst value = -old-;\n```",
	);
	assert.equal(markdownToJira("~~removed~~"), "-removed-");
	assert.equal(jiraToMarkdown("-removed-"), "~~removed~~");
});
