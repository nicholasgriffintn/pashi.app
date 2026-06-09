import assert from "node:assert/strict";
import { test } from "node:test";

import { parsePublicHttpUrl } from "./urls.ts";

test("accepts public http and https urls", () => {
	assert.equal(parsePublicHttpUrl("https://nicholasgriffin.dev/avatar.png")?.href, "https://nicholasgriffin.dev/avatar.png");
	assert.equal(parsePublicHttpUrl("http://203.0.113.10/image.jpg")?.href, "http://203.0.113.10/image.jpg");
});

test("rejects non-http and local image source urls", () => {
	assert.equal(parsePublicHttpUrl("file:///tmp/image.png"), undefined);
	assert.equal(parsePublicHttpUrl("http://localhost/image.png"), undefined);
	assert.equal(parsePublicHttpUrl("http://127.0.0.1/image.png"), undefined);
	assert.equal(parsePublicHttpUrl("http://192.168.1.10/image.png"), undefined);
	assert.equal(parsePublicHttpUrl("http://service.local/image.png"), undefined);
	assert.equal(parsePublicHttpUrl("https://user:pass@example.com/image.png"), undefined);
});
