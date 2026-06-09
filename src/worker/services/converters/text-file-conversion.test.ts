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

test("converts csv records to yaml", () => {
	assert.equal(
		convertTextFileContent("name,role\nAda,admin", "yaml").content,
		[
			"- name: Ada",
			"  role: admin",
		].join("\n"),
	);
});

test("converts json records to xml", () => {
	assert.equal(
		convertTextFileContent("[{\"name\":\"Ada\",\"role\":\"admin\"}]", "xml", "people.json").content,
		[
			"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
			"<items>",
			"\t<item>",
			"\t\t<name>Ada</name>",
			"\t\t<role>admin</role>",
			"\t</item>",
			"</items>",
		].join("\n"),
	);
});

test("converts env key value files to formatted json", () => {
	assert.equal(
		convertTextFileContent("PASHI_ENV=production\nPASHI_REGION=eu", "json", "settings.env").content,
		JSON.stringify({ PASHI_ENV: "production", PASHI_REGION: "eu" }, null, 2),
	);
});

test("converts records to sql inserts using the source filename", () => {
	assert.equal(
		convertTextFileContent("name,role\nAda,admin", "sql", "team.csv").content,
		"INSERT INTO team (name, role) VALUES ('Ada', 'admin');",
	);
});

test("converts simple xml records to json and csv", () => {
	const xml = [
		"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
		"<items>",
		"\t<item><name>Ada</name><role>admin</role></item>",
		"\t<item><name>Grace</name><role>editor</role></item>",
		"</items>",
	].join("\n");

	assert.equal(
		convertTextFileContent(xml, "json", "team.xml").content,
		JSON.stringify([
			{ name: "Ada", role: "admin" },
			{ name: "Grace", role: "editor" },
		], null, 2),
	);
	assert.equal(
		convertTextFileContent(xml, "csv", "team.xml").content,
		recordsToCsv([
			{ name: "Ada", role: "admin" },
			{ name: "Grace", role: "editor" },
		]),
	);
});

test("converts records to tsv and Excel-compatible xls tables", () => {
	assert.equal(
		convertTextFileContent("name,role\nAda,admin", "tsv", "team.csv").content,
		"name\trole\nAda\tadmin",
	);

	const xls = convertTextFileContent("name,role\nAda,admin", "xls", "team.csv");
	assert.equal(xls.extension, "xls");
	assert.equal(xls.mimeType, "application/vnd.ms-excel;charset=utf-8");
	assert.match(xls.content, /<table>/);
	assert.match(xls.content, /<td>Ada<\/td>/);
});
