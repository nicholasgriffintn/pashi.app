import assert from "node:assert/strict";
import { test } from "node:test";

import { findGenerator } from "./index.ts";

test("generator aliases resolve 1000freetools-style generator names to existing tools", () => {
	assert.equal(findGenerator("bulk-uuid-generator")?.id, "uuid");
	assert.equal(findGenerator("uuid-v1-generator")?.id, "uuid");
	assert.equal(findGenerator("md5-hash-generator-checker")?.id, "hash");
	assert.equal(findGenerator("jwt-generator-signer")?.id, "jwt-token");
	assert.equal(findGenerator("color-palette-generator")?.id, "palette");
	assert.equal(findGenerator("random-color-palette-generator")?.id, "palette");
	assert.equal(findGenerator("lorem-ipsum-generator")?.id, "lorem");
	assert.equal(findGenerator("random-emoji-generator")?.id, "emoji");
	assert.equal(findGenerator("url-utm-builder")?.id, "utm");
	assert.equal(findGenerator("url-slug-generator")?.id, "slug");
	assert.equal(findGenerator("text-to-slug-converter")?.id, "slug");
});

test("css and chart generator aliases resolve to implemented generator engines", () => {
	assert.equal(findGenerator("css-gradient-generator")?.id, "css-gradient");
	assert.equal(findGenerator("gradient-generator")?.id, "css-gradient");
	assert.equal(findGenerator("box-shadow-generator")?.id, "box-shadow");
	assert.equal(findGenerator("text-shadow-generator")?.id, "text-shadow");
	assert.equal(findGenerator("border-radius-generator")?.id, "border-radius");
	assert.equal(findGenerator("bar-graph-generator")?.id, "chart-svg");
	assert.equal(findGenerator("word-cloud-generator")?.id, "chart-svg");
});

test("developer generator aliases resolve to implemented snippet engines", () => {
	assert.equal(findGenerator("cron-expression-generator")?.id, "cron-expression");
	assert.equal(findGenerator("json-schema-example-generator")?.id, "json-schema-example");
	assert.equal(findGenerator("html-meta-tag-generator")?.id, "html-meta-tags");
	assert.equal(findGenerator("json-to-typescript")?.id, "json-to-typescript");
	assert.equal(findGenerator("json-fetch-code-generator")?.id, "json-fetch-code");
	assert.equal(findGenerator("json-axios-code-generator")?.id, "json-axios-code");
	assert.equal(findGenerator("json-api-response-generator")?.id, "json-api-response");
});

test("JSON to TypeScript exposes JSON textarea and interface name fields", () => {
	const generator = findGenerator("json-to-typescript");

	assert.equal(generator?.input.fields?.[0]?.id, "json");
	assert.equal(generator?.input.fields?.[0]?.type, "textarea");
	assert.equal(generator?.input.fields?.[1]?.id, "name");
	assert.equal(generator?.input.fields?.[1]?.label, "Interface name");
});
