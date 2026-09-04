import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test("the hub lists projects and links into the tools console", async ({ page }) => {
	await page.goto("/");

	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pashi");
	await expect(page.getByRole("heading", { name: "Tools" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Marquee" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Chrome extensions" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Header Forge" })).toBeVisible();

	await page.getByRole("link", { name: /Tools/ }).first().click();
	await expect(page).toHaveURL(/\/tools$/);
});

test("a generator runs and offers a share link", async ({ page }) => {
	await page.goto("/tools/uuid");

	const submit = page.getByRole("button", { name: "Generate UUID" });

	await expect(submit).toBeVisible();
	await submit.click();

	await expect(page.getByRole("button", { name: /Copy a link/ })).toBeVisible();
	await expect(page).toHaveURL(/\?/);
});

test("the theme toggle switches and persists", async ({ page }) => {
	await page.goto("/");

	const initial = await page.evaluate(() => document.documentElement.dataset.theme);

	await page.locator(".theme-toggle").first().click();

	const switched = await page.evaluate(() => document.documentElement.dataset.theme);

	expect(switched).not.toBe(initial);

	await page.reload();

	await expect
		.poll(() => page.evaluate(() => document.documentElement.dataset.theme))
		.toBe(switched);
});

test("the api documentation page lists tools from the catalogue", async ({ page }) => {
	await page.goto("/api");

	await expect(page.getByRole("heading", { level: 1 })).toHaveText("API");
	await expect(page.locator(".api-tool-list li").first()).toBeVisible();
});

test("labs lists the experiments and opens Ask Pashi", async ({ page }) => {
	await page.goto("/labs");

	await expect(page.getByRole("heading", { name: "Ask Pashi" })).toBeVisible();

	await page.getByRole("link", { name: "Open" }).first().click();

	await expect(page).toHaveURL(/\/labs\/ask$/);
	await expect(page.getByLabel("What do you need?")).toBeVisible();
});

test("the tool picker opens with a keyboard shortcut and filters", async ({ page }) => {
	await page.goto("/tools");

	await expect(page.getByRole("button", { name: /Choose a generator/i })).toBeVisible();
	await page.keyboard.press("/");

	const search = page.getByPlaceholder("Search generators");

	await expect(search).toBeVisible();
	await search.fill("uuid");

	await expect(page.getByRole("option").first()).toContainText(/UUID/i);
});

test("the explainers page offers every subject", async ({ page }) => {
	await page.goto("/labs/explain");

	await expect(page.getByRole("button", { name: "Regex" })).toHaveAttribute("aria-pressed", "true");

	await page.getByRole("button", { name: "Cron" }).click();

	await expect(page.getByLabel("Cron to explain")).toBeVisible();
});

test("the command palette searches tools, pages and actions", async ({ page }) => {
	await page.goto("/");

	await page
		.getByRole("button", { name: /^Search/ })
		.first()
		.click();

	const search = page.getByPlaceholder("Search tools, pages and actions");

	await expect(search).toBeVisible();
	await search.fill("jira");

	await expect(page.getByRole("option").first()).toContainText(/Jira/i);

	await page.keyboard.press("Enter");

	await expect(page).toHaveURL(/\/tools\/convert\//);
});

async function storedHistoryCount(page: Page) {
	return page.evaluate(
		() =>
			new Promise<number>((resolve) => {
				const request = indexedDB.open("pashi", 1);

				request.onerror = () => resolve(0);

				request.onsuccess = () => {
					const store = request.result.transaction("history", "readonly").objectStore("history");
					const all = store.getAll();

					all.onerror = () => resolve(0);

					all.onsuccess = () => resolve(all.result.length);
				};
			}),
	);
}

test("results persist across a reload", async ({ page }) => {
	await page.goto("/tools/uuid");

	const submit = page.getByRole("button", { name: "Generate UUID" });

	await expect(submit).toBeVisible();
	await submit.click();
	await expect(page.getByRole("button", { name: /Copy a link/ })).toBeVisible();

	await page.goto("/tools/uuid");

	await expect.poll(() => storedHistoryCount(page), { timeout: 10_000 }).toBeGreaterThan(0);
});

test("signing in stores the key and the header reflects it", async ({ page }) => {
	await page.goto("/sign-in");

	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
	await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

	await page.getByLabel("API key").fill("smoke-test-key-0123456789abcdef0123456789");

	await expect(page.getByRole("link", { name: "Signed in" })).toBeVisible();

	await page.goto("/labs/ask");

	await expect(page.getByRole("link", { name: "Signed in" })).toBeVisible();
	await expect(page.getByText(/needs an API key/)).toHaveCount(0);
});

test("the health endpoint reports service status", async ({ request }) => {
	const response = await request.get("/api/health");
	const body = await response.json();

	expect(["ok", "degraded"]).toContain(body.status);
	expect(body.checks).toBeDefined();
});

test("an unknown tool returns a structured error", async ({ request }) => {
	const response = await request.get("/api/definitely-not-a-tool");

	expect(response.status()).toBe(404);
	expect(await response.json()).toMatchObject({ code: "not_found" });
});
