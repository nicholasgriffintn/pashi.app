import assert from "node:assert/strict";
import { test } from "node:test";

import {
	bodyFromFormData,
	fieldsFromFormData,
	fieldsFromJsonBody,
	fieldsFromSearchParams,
	normaliseFields,
} from "./body.ts";

test("normalises string-only request fields", () => {
	assert.deepEqual(normaliseFields({
		count: 4,
		format: "json",
		sourceName: "people.csv",
	}), {
		format: "json",
		sourceName: "people.csv",
	});
});

test("reads converter fields from query parameters without treating input as a field", () => {
	const params = new URLSearchParams({
		data: "ignored alias",
		file: "ignored file name",
		input: "ignored",
		outputFormat: "csv",
		sourceName: "people.json",
	});

	assert.deepEqual(fieldsFromSearchParams(params), {
		outputFormat: "csv",
		sourceName: "people.json",
	});
});

test("reads converter fields from multipart form data", async () => {
	const formData = new FormData();
	formData.set("outputFormat", "json");
	formData.set("ignoredNumber", new Blob(["4"], { type: "text/plain" }));
	formData.set("file", new File(["name,role\nAda,admin"], "people.csv", { type: "text/csv" }));

	assert.deepEqual(fieldsFromFormData(formData), {
		outputFormat: "json",
	});
	assert.deepEqual(await bodyFromFormData(formData), {
		fields: {
			outputFormat: "json",
			sourceName: "people.csv",
		},
		input: "name,role\nAda,admin",
	});
});

test("reads converter input from multipart form data without a file", async () => {
	const formData = new FormData();
	formData.set("input", "# Title");
	formData.set("outputFormat", "md");

	assert.deepEqual(await bodyFromFormData(formData, { sourceName: "query.md" }), {
		fields: {
			outputFormat: "md",
			sourceName: "query.md",
		},
		input: "# Title",
	});
});

test("reads converter fields from JSON bodies", () => {
	assert.deepEqual(fieldsFromJsonBody({
		fields: {
			format: "md",
			ignored: false,
			sourceName: "notes.html",
		},
		input: "<h1>Notes</h1>",
	}), {
		format: "md",
		sourceName: "notes.html",
	});
});
