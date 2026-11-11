import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
	forbidOnly: Boolean(process.env.CI),
	fullyParallel: true,
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	reporter: process.env.CI ? "github" : "list",
	retries: process.env.CI ? 1 : 0,
	testDir: "./tests/smoke",
	timeout: 30_000,
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: "on-first-retry",
	},
	webServer: {
		command: `node scripts/seed-dev-key.mjs && pnpm exec vite preview --port ${PORT} --strictPort`,
		env: { PASHI_REMOTE_BINDINGS: "off" },
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		url: `http://localhost:${PORT}`,
	},
});
