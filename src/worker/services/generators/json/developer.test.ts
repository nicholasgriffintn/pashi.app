import assert from "node:assert/strict";
import { test } from "node:test";

import { findGenerator } from "../catalogue/index.ts";
import { createGeneratorRequest } from "../request.ts";
import { createDeveloperResult } from "./developer.ts";

test("generates a curated regex pattern with examples", () => {
	const generator = findGenerator("regex-pattern");
	assert.ok(generator);

	const result = createDeveloperResult(generator, createGeneratorRequest("", {
		anchors: "true",
		flags: "i",
		preset: "uuid",
	}));

	assert.equal(result?.kind, "fields");
	assert.deepEqual(result?.result, {
		description: "UUID v4-style identifier.",
		exampleMatch: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
		exampleNonMatch: "f47ac10b58cc4372a5670e02b2c3d479",
		flags: "i",
		javascriptLiteral: "/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i",
		notes: "Curated linear-time pattern; still validate business rules separately.",
		pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
	});
});
