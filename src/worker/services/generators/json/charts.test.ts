import assert from "node:assert/strict";
import { test } from "node:test";

import { findGenerator } from "../catalogue/index.ts";
import { createGeneratorRequest } from "../request.ts";
import { createChartResult } from "./charts.ts";

test("generates simple svg bar chart markup from label-value rows", () => {
	const generator = findGenerator("chart-svg");
	assert.ok(generator);

	const result = createChartResult(generator, createGeneratorRequest("", {
		data: "Apples: 10\nPears: 5",
		type: "bar",
	}));

	assert.equal(result?.kind, "text");
	assert.match(String(result?.result), /^<svg /);
	assert.match(String(result?.result), /<rect /);
	assert.match(String(result?.result), />Apples</);
});
