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
