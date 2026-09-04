import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const APPLICATION_ID = "local-dev";
const DEV_KEY = "pashi-local-dev-key-0123456789abcdef0123456789abcdef";
const ENV_FILE = resolve(ROOT, ".env.local");
const ENV_LINE = `VITE_PASHI_DEV_API_KEY=${DEV_KEY}`;

function wrangler(args) {
	return spawnSync("pnpm", ["exec", "wrangler", ...args], {
		cwd: ROOT,
		encoding: "utf8",
		env: { ...process.env, CI: "true" },
	});
}

function kvGet(key) {
	const result = wrangler(["kv", "key", "get", key, "--binding", "APPLICATIONS", "--local"]);
	const value = result.status === 0 ? result.stdout.trim() : "";

	return value === "Value not found" ? "" : value;
}

function kvPut(key, value) {
	const result = wrangler(["kv", "key", "put", key, value, "--binding", "APPLICATIONS", "--local"]);

	if (result.status !== 0) {
		throw new Error(result.stderr || result.stdout || `wrangler exited ${result.status}`);
	}
}

function ensureEnvFile() {
	const current = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";

	if (current.includes("VITE_PASHI_DEV_API_KEY=")) {
		return;
	}

	const separator = current && !current.endsWith("\n") ? "\n" : "";

	writeFileSync(ENV_FILE, `${current}${separator}${ENV_LINE}\n`);
	console.log("seed: wrote VITE_PASHI_DEV_API_KEY to .env.local");
}

function main() {
	const digest = createHash("sha256").update(DEV_KEY).digest("hex");
	const applicationKey = `applications:v1:${APPLICATION_ID}`;
	const apiKeyKey = `api-keys:v1:${digest}`;

	if (kvGet(apiKeyKey) && kvGet(applicationKey)) {
		console.log("seed: local dev key already present");
	} else {
		kvPut(
			applicationKey,
			JSON.stringify({ enabled: true, id: APPLICATION_ID, name: "Local development" }),
		);
		kvPut(apiKeyKey, JSON.stringify({ applicationId: APPLICATION_ID, enabled: true }));
		console.log(`seed: created local dev key for application ${APPLICATION_ID}`);
	}

	ensureEnvFile();
	console.log(`seed: dev key is ${DEV_KEY}`);
}

try {
	main();
} catch (error) {
	console.error("seed: could not seed the local dev key");
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
