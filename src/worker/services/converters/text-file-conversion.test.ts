import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCsv, recordsToCsv } from "../../utils/csv.ts";
import { convertTextFileContent } from "./text-file-conversion.ts";

test("parses quoted csv into records", () => {
	assert.deepEqual(parseCsv("name,note\nAda,\"hello, world\"\nGrace,\"quoted \"\"value\"\"\""), [
		{ name: "Ada", note: "hello, world" },
		{ name: "Grace", note: "quoted \"value\"" },
	]);
});

test("converts record JSON arrays to csv", () => {
	assert.equal(
		convertTextFileContent("[{\"name\":\"Ada\",\"role\":\"admin\"}]", "csv").content,
		`${recordsToCsv([{ name: "Ada", role: "admin" }])}`,
	);
});

test("converts csv records to formatted json", () => {
	assert.equal(
		convertTextFileContent("name,role\nAda,admin", "json").content,
		JSON.stringify([{ name: "Ada", role: "admin" }], null, 2),
	);
});

test("escapes text when creating html files", () => {
	const html = convertTextFileContent("<script>alert(1)</script>", "html", "demo.html").content;

	assert.doesNotMatch(html, /alert\(1\)/);
	assert.doesNotMatch(html, /<script>alert/);
});

test("converts csv records to markdown tables", () => {
	assert.equal(
		convertTextFileContent("name,role\nAda,admin", "md").content,
		[
			"| name | role |",
			"| --- | --- |",
			"| Ada | admin |",
		].join("\n"),
	);
});

test("converts json records to html tables", () => {
	const html = convertTextFileContent("[{\"name\":\"Ada\",\"role\":\"admin\"}]", "html", "data.json").content;

	assert.match(html, /<table>/);
	assert.match(html, /<th>name<\/th>/);
	assert.match(html, /<td>Ada<\/td>/);
});

test("strips html tags for txt output", () => {
	assert.equal(
		convertTextFileContent("<p>Hello <strong>world</strong></p>", "txt").content,
		"Hello world",
	);
});
