import assert from "node:assert/strict";
import { test } from "node:test";

import { findGenerator } from "../catalogue/index.ts";
import { createGeneratorRequest } from "../request.ts";
import { createCssResult } from "./css.ts";

test("generates a deterministic css gradient snippet", () => {
	const generator = findGenerator("css-gradient");
	assert.ok(generator);

	const result = createCssResult(generator, createGeneratorRequest("", {
		angle: "90",
		from: "#ff0000",
		to: "#0000ff",
	}));

	assert.equal(result?.kind, "text");
	assert.equal(result?.result, "background: linear-gradient(90deg, #ff0000 0%, #0000ff 100%);");
});

test("generates box shadow and border radius snippets", () => {
	const boxShadow = findGenerator("box-shadow");
	const borderRadius = findGenerator("border-radius");
	assert.ok(boxShadow);
	assert.ok(borderRadius);

	assert.equal(
		createCssResult(boxShadow, createGeneratorRequest("", {
			blur: "24",
			color: "rgba(15, 23, 42, 0.18)",
			spread: "0",
			x: "0",
			y: "8",
		}))?.result,
		"box-shadow: 0px 8px 24px 0px rgba(15, 23, 42, 0.18);",
	);
	assert.equal(
		createCssResult(borderRadius, createGeneratorRequest("12"))?.result,
		"border-radius: 12px;",
	);
});
