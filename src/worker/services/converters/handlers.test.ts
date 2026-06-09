import assert from "node:assert/strict";
import { test } from "node:test";

import { ConverterRequestError, converterHandlers } from "./handlers.ts";

test("rejects unsupported text-file output formats instead of silently returning txt", () => {
	assert.throws(
		() => converterHandlers["file-format"]({
			fields: { outputFormat: "docx" },
			input: "hello",
		}),
		(error: unknown) =>
			error instanceof ConverterRequestError &&
			error.message.includes("supported text-file output format"),
	);
});

test("converts text through encoding and case transforms", () => {
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "binary" },
			input: "Hi",
		}).result,
		"01001000 01101001",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "from-binary" },
			input: "01001000 01101001",
		}).result,
		"Hi",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "kebab" },
			input: "Hello, Pashi App!",
		}).result,
		"hello-pashi-app",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "leet" },
			input: "elite tools",
		}).result,
		"31173 70015",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "url-encode" },
			input: "https://pashi.app/?q=hello world",
		}).result,
		"https%3A%2F%2Fpashi.app%2F%3Fq%3Dhello%20world",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "url-decode" },
			input: "https%3A%2F%2Fpashi.app%2F%3Fq%3Dhello%20world",
		}).result,
		"https://pashi.app/?q=hello world",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "unicode-escape" },
			input: "Hi ⚡",
		}).result,
		"\\u0048\\u0069\\u0020\\u26a1",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "unicode-unescape" },
			input: "\\u0048\\u0069\\u0020\\u26a1",
		}).result,
		"Hi ⚡",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "remove-whitespace" },
			input: " Pashi \n tools\t ",
		}).result,
		"Pashitools",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "reverse" },
			input: "Pashi",
		}).result,
		"ihsaP",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "sort-lines" },
			input: "pear\nApple\nbanana",
		}).result,
		"Apple\nbanana\npear",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "unique-lines" },
			input: "Ada\nGrace\nAda",
		}).result,
		"Ada\nGrace",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "dedupe-words" },
			input: "Pashi pashi tools tools",
		}).result,
		"Pashi tools",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "word-count" },
			input: "Pashi builds fast tools.",
		}).result,
		"4",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "character-count" },
			input: "Pashi",
		}).result,
		"5",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "sentence-count" },
			input: "One. Two! Three?",
		}).result,
		"3",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "text-size" },
			input: "é",
		}).result,
		"2 bytes",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "word-frequency" },
			input: "Pashi pashi tools",
		}).result,
		"pashi: 2\ntools: 1",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "hashtags" },
			input: "Pashi tools are fast",
		}).result,
		"#Pashi #tools #are #fast",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "list" },
			input: "Ada, Grace, Margaret",
		}).result,
		"Ada\nGrace\nMargaret",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { count: "3", outputFormat: "repeat" },
			input: "Hi",
		}).result,
		"Hi\nHi\nHi",
	);
	assert.equal(
		converterHandlers["text-transform"]({
			fields: { outputFormat: "replace", replace: "Pashi", search: "tools" },
			input: "Fast tools",
		}).result,
		"Fast Pashi",
	);
});

test("transforms JSON with formatter, sorter, flattener, keys, and encoders", () => {
	assert.equal(
		converterHandlers["json-transform"]({
			fields: { outputFormat: "format" },
			input: "{\"b\":2,\"a\":{\"c\":3}}",
		}).result,
		"{\n  \"b\": 2,\n  \"a\": {\n    \"c\": 3\n  }\n}",
	);
	assert.equal(
		converterHandlers["json-transform"]({
			fields: { outputFormat: "minify" },
			input: "{\n  \"ok\": true\n}",
		}).result,
		"{\"ok\":true}",
	);
	assert.equal(
		converterHandlers["json-transform"]({
			fields: { outputFormat: "sort" },
			input: "{\"b\":2,\"a\":{\"d\":4,\"c\":3}}",
		}).result,
		"{\n  \"a\": {\n    \"c\": 3,\n    \"d\": 4\n  },\n  \"b\": 2\n}",
	);
	assert.equal(
		converterHandlers["json-transform"]({
			fields: { outputFormat: "flatten" },
			input: "{\"user\":{\"name\":\"Ada\"},\"tags\":[\"admin\"]}",
		}).result,
		"{\n  \"tags.0\": \"admin\",\n  \"user.name\": \"Ada\"\n}",
	);
	assert.equal(
		converterHandlers["json-transform"]({
			fields: { outputFormat: "keys" },
			input: "{\"user\":{\"name\":\"Ada\"},\"tags\":[\"admin\"]}",
		}).result,
		"tags\ntags.0\nuser\nuser.name",
	);
	assert.equal(
		converterHandlers["json-transform"]({
			fields: { outputFormat: "base64" },
			input: "{\"ok\":true}",
		}).result,
		"eyJvayI6dHJ1ZX0=",
	);
	assert.equal(
		converterHandlers["json-transform"]({
			fields: { outputFormat: "from-base64" },
			input: "eyJvayI6dHJ1ZX0=",
		}).result,
		"{\"ok\":true}",
	);
	assert.equal(
		converterHandlers["json-transform"]({
			fields: { outputFormat: "escape" },
			input: "{\"ok\":true}",
		}).result,
		"{\\\"ok\\\":true}",
	);
	assert.equal(
		converterHandlers["json-transform"]({
			fields: { outputFormat: "unescape" },
			input: "{\\\"ok\\\":true}",
		}).result,
		"{\"ok\":true}",
	);
});

test("transforms URLs with parsing and extraction modes", () => {
	assert.equal(
		converterHandlers["url-transform"]({
			fields: { outputFormat: "parse" },
			input: "https://example.com:8443/docs?q=pashi&tag=tools#top",
		}).result,
		"{\n  \"hash\": \"#top\",\n  \"host\": \"example.com:8443\",\n  \"hostname\": \"example.com\",\n  \"href\": \"https://example.com:8443/docs?q=pashi&tag=tools#top\",\n  \"origin\": \"https://example.com:8443\",\n  \"pathname\": \"/docs\",\n  \"port\": \"8443\",\n  \"protocol\": \"https:\",\n  \"search\": \"?q=pashi&tag=tools\"\n}",
	);
	assert.equal(
		converterHandlers["url-transform"]({
			fields: { outputFormat: "query" },
			input: "https://example.com/search?q=pashi&tag=tools&tag=fast",
		}).result,
		"{\n  \"q\": \"pashi\",\n  \"tag\": [\n    \"tools\",\n    \"fast\"\n  ]\n}",
	);
	assert.equal(
		converterHandlers["url-transform"]({
			fields: { outputFormat: "extract-links" },
			input: "Read https://pashi.app and https://example.com/docs.",
		}).result,
		"https://pashi.app\nhttps://example.com/docs",
	);
	assert.equal(
		converterHandlers["url-transform"]({
			fields: { outputFormat: "extract-emails" },
			input: "Email hello@example.com or support@pashi.app.",
		}).result,
		"hello@example.com\nsupport@pashi.app",
	);
	assert.equal(
		converterHandlers["url-transform"]({
			fields: { outputFormat: "dedupe-links" },
			input: "https://pashi.app https://pashi.app https://example.com",
		}).result,
		"https://pashi.app\nhttps://example.com",
	);
});

test("transforms HTML with escaping, stripping, extraction, and markdown output", () => {
	assert.equal(
		converterHandlers["html-transform"]({
			fields: { outputFormat: "escape" },
			input: "<p>Ada & Grace</p>",
		}).result,
		"&lt;p&gt;Ada &amp; Grace&lt;/p&gt;",
	);
	assert.equal(
		converterHandlers["html-transform"]({
			fields: { outputFormat: "unescape" },
			input: "&lt;p&gt;Ada &amp; Grace&lt;/p&gt;",
		}).result,
		"<p>Ada & Grace</p>",
	);
	assert.equal(
		converterHandlers["html-transform"]({
			fields: { outputFormat: "strip-tags" },
			input: "<h1>Title</h1><p>Hello <strong>world</strong>.</p>",
		}).result,
		"Title\nHello world.",
	);
	assert.equal(
		converterHandlers["html-transform"]({
			fields: { outputFormat: "extract-links" },
			input: "<a href=\"https://pashi.app\">Pashi</a><a href=\"mailto:hello@example.com\">Email</a>",
		}).result,
		"https://pashi.app\nmailto:hello@example.com",
	);
	assert.equal(
		converterHandlers["html-transform"]({
			fields: { outputFormat: "extract-comments" },
			input: "<!-- keep --><p>Hello</p><!-- remove -->",
		}).result,
		"keep\nremove",
	);
	assert.equal(
		converterHandlers["html-transform"]({
			fields: { outputFormat: "remove-comments" },
			input: "<!-- keep --><p>Hello</p>",
		}).result,
		"<p>Hello</p>",
	);
	assert.equal(
		converterHandlers["html-transform"]({
			fields: { outputFormat: "to-markdown" },
			input: "<h1>Title</h1><p>Hello <strong>world</strong>.</p><ul><li>One</li></ul>",
		}).result,
		"# Title\n\nHello **world**.\n\n- One",
	);
});

test("transforms timestamps across common deterministic formats", () => {
	assert.equal(
		converterHandlers["timestamp-transform"]({
			fields: { outputFormat: "unix" },
			input: "2024-01-02T03:04:05Z",
		}).result,
		"1704164645",
	);
	assert.equal(
		converterHandlers["timestamp-transform"]({
			fields: { outputFormat: "milliseconds" },
			input: "2024-01-02T03:04:05Z",
		}).result,
		"1704164645000",
	);
	assert.equal(
		converterHandlers["timestamp-transform"]({
			fields: { outputFormat: "iso" },
			input: "1704164645",
		}).result,
		"2024-01-02T03:04:05.000Z",
	);
	assert.equal(
		converterHandlers["timestamp-transform"]({
			fields: { outputFormat: "readable" },
			input: "1704164645",
		}).result,
		"Tue, 02 Jan 2024 03:04:05 GMT",
	);
	assert.equal(
		converterHandlers["timestamp-transform"]({
			fields: { outputFormat: "rfc2822" },
			input: "2024-01-02T03:04:05Z",
		}).result,
		"Tue, 02 Jan 2024 03:04:05 +0000",
	);
	assert.equal(
		converterHandlers["timestamp-transform"]({
			fields: { outputFormat: "discord", style: "relative" },
			input: "2024-01-02T03:04:05Z",
		}).result,
		"<t:1704164645:R>",
	);
	assert.equal(
		converterHandlers["timestamp-transform"]({
			fields: { amount: "2", outputFormat: "add", unit: "days" },
			input: "2024-01-02T03:04:05Z",
		}).result,
		"2024-01-04T03:04:05.000Z",
	);
	assert.equal(
		converterHandlers["timestamp-transform"]({
			fields: { outputFormat: "difference", until: "2024-01-03T03:04:05Z" },
			input: "2024-01-02T03:04:05Z",
		}).result,
		"{\n  \"days\": 1,\n  \"hours\": 24,\n  \"milliseconds\": 86400000,\n  \"minutes\": 1440,\n  \"seconds\": 86400\n}",
	);
});

test("converts common units from a value and source unit", () => {
	assert.equal(
		converterHandlers["unit-converter"]({
			fields: { outputFormat: "ft" },
			input: "10 m",
		}).result,
		"32.8084 ft",
	);
	assert.equal(
		converterHandlers["unit-converter"]({
			fields: { outputFormat: "f" },
			input: "100 c",
		}).result,
		"212 °F",
	);
	assert.equal(
		converterHandlers["unit-converter"]({
			fields: { outputFormat: "mb" },
			input: "1048576 b",
		}).result,
		"1 MB",
	);
	assert.equal(
		converterHandlers["unit-converter"]({
			fields: { outputFormat: "rad" },
			input: "180 deg",
		}).result,
		"3.1416 rad",
	);
	assert.equal(
		converterHandlers["unit-converter"]({
			fields: { outputFormat: "psi" },
			input: "1 bar",
		}).result,
		"14.5038 psi",
	);
	assert.equal(
		converterHandlers["unit-converter"]({
			fields: { outputFormat: "j" },
			input: "1 kwh",
		}).result,
		"3600000 J",
	);
	assert.equal(
		converterHandlers["unit-converter"]({
			fields: { outputFormat: "min" },
			input: "120 s",
		}).result,
		"2 min",
	);
	assert.equal(
		converterHandlers["unit-converter"]({
			fields: { outputFormat: "w" },
			input: "1 hp",
		}).result,
		"745.6999 W",
	);
	assert.equal(
		converterHandlers["unit-converter"]({
			fields: { outputFormat: "khz" },
			input: "60 hz",
		}).result,
		"0.06 kHz",
	);
	assert.equal(
		converterHandlers["unit-converter"]({
			fields: { outputFormat: "lbf" },
			input: "10 n",
		}).result,
		"2.2481 lbf",
	);
	assert.equal(
		converterHandlers["unit-converter"]({
			fields: { outputFormat: "lbft" },
			input: "10 nm",
		}).result,
		"7.3756 lb-ft",
	);
});

test("converts markdown to Slack and WordPress HTML targets", () => {
	assert.equal(
		converterHandlers["markdown-format"]({
			fields: { outputFormat: "slack" },
			input: "## Release notes\n\n- **Fixed** auth\n- [Pashi](https://pashi.app)",
		}).result,
		"*Release notes*\n\n• *Fixed* auth\n• <https://pashi.app|Pashi>",
	);
	assert.equal(
		converterHandlers["markdown-format"]({
			fields: { outputFormat: "wordpress-html" },
			input: "## Release notes\n\n- **Fixed** auth",
		}).result,
		"<h2>Release notes</h2>\n<ul>\n<li><strong>Fixed</strong> auth</li>\n</ul>",
	);
});
