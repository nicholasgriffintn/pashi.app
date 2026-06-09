import assert from "node:assert/strict";
import { test } from "node:test";

import { findGenerator } from "../catalogue/index.ts";
import { createGeneratorRequest } from "../request.ts";
import { createDeveloperResult } from "./developer.ts";

test("generates common cron expressions from presets", () => {
	const generator = findGenerator("cron-expression");
	assert.ok(generator);

	const result = createDeveloperResult(generator, createGeneratorRequest("", {
		preset: "daily",
		hour: "9",
		minute: "30",
	}));

	assert.equal(result?.kind, "fields");
	assert.deepEqual(result?.result, {
		description: "Every day at 09:30",
		expression: "30 9 * * *",
	});
});

test("generates a JSON schema example from fields", () => {
	const generator = findGenerator("json-schema-example");
	assert.ok(generator);

	const result = createDeveloperResult(generator, createGeneratorRequest("", {
		fields: "name:string\nage:number\nactive:boolean",
		title: "Person",
	}));

	assert.equal(result?.kind, "text");
	assert.match(String(result?.result), /"title": "Person"/);
	assert.match(String(result?.result), /"name"/);
	assert.match(String(result?.result), /"type": "boolean"/);
});

test("generates HTML meta tags with escaped values", () => {
	const generator = findGenerator("html-meta-tags");
	assert.ok(generator);

	const result = createDeveloperResult(generator, createGeneratorRequest("", {
		description: "Fast tools & converters",
		title: "Pashi",
		url: "https://pashi.app",
	}));

	assert.equal(result?.kind, "text");
	assert.match(String(result?.result), /<title>Pashi<\/title>/);
	assert.match(String(result?.result), /content="Fast tools &amp; converters"/);
	assert.match(String(result?.result), /property="og:url" content="https:\/\/pashi.app"/);
});

test("generates a TypeScript interface from sample JSON", () => {
	const generator = findGenerator("json-to-typescript");
	assert.ok(generator);

	const result = createDeveloperResult(generator, createGeneratorRequest("", {
		json: JSON.stringify({
			active: true,
			id: 123,
			name: "Ada",
			tags: ["admin"],
		}),
		name: "UserProfile",
	}));

	assert.equal(result?.kind, "text");
	assert.match(String(result?.result), /interface UserProfile/);
	assert.match(String(result?.result), /id: number;/);
	assert.match(String(result?.result), /tags: string\[\];/);
});

test("prefers the explicit JSON textarea field for TypeScript interfaces", () => {
	const generator = findGenerator("json-to-typescript");
	assert.ok(generator);

	const result = createDeveloperResult(generator, createGeneratorRequest("{\"ignored\":true}", {
		json: "{\"id\":123}",
		name: "Payload",
	}));

	assert.match(String(result?.result), /interface Payload/);
	assert.match(String(result?.result), /id: number;/);
	assert.doesNotMatch(String(result?.result), /ignored/);
});

test("generates JSON request snippets", () => {
	const fetchGenerator = findGenerator("json-fetch-code");
	const axiosGenerator = findGenerator("json-axios-code");
	assert.ok(fetchGenerator);
	assert.ok(axiosGenerator);

	const fetchResult = createDeveloperResult(fetchGenerator, createGeneratorRequest("{\"ok\":true}", {
		method: "POST",
		url: "https://api.example.com/items",
	}));
	const axiosResult = createDeveloperResult(axiosGenerator, createGeneratorRequest("{\"ok\":true}", {
		method: "PATCH",
		url: "https://api.example.com/items/1",
	}));

	assert.match(String(fetchResult?.result), /fetch\("https:\/\/api.example.com\/items"/);
	assert.match(String(fetchResult?.result), /method: "POST"/);
	assert.match(String(axiosResult?.result), /axios.patch\("https:\/\/api.example.com\/items\/1"/);
	assert.match(String(axiosResult?.result), /"ok": true/);
});

test("generates a JSON API response wrapper", () => {
	const generator = findGenerator("json-api-response");
	assert.ok(generator);

	const result = createDeveloperResult(generator, createGeneratorRequest("{\"id\":123}", {
		status: "201",
		success: "true",
	}));

	assert.equal(result?.kind, "text");
	assert.match(String(result?.result), /"success": true/);
	assert.match(String(result?.result), /"status": 201/);
	assert.match(String(result?.result), /"data":/);
});
