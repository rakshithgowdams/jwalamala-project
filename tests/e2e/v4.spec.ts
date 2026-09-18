import { test, expect } from "@playwright/test";
test("new public sections load without overflow", async ({ page }) => {
  test.setTimeout(120000);
  for (const route of [
    "/topics",
    "/series",
    "/basadis",
    "/notices",
    "/opportunities",
    "/weather",
    "/jain-calendar",
    "/polls",
    "/quizzes",
    "/gallery",
    "/stories",
    "/live",
    "/reservoirs",
    "/rates",
    "/newsletter",
  ]) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("#main h1").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBe(true);
  }
});
test("sample polls and quizzes have truthful local results", async ({
  page,
}) => {
  await page.goto("/polls");
  const poll = page.locator("#main .utility-panel").first();
  await poll.getByRole("radio").first().check();
  await poll.getByRole("button", { name: "ಮತ ನೀಡಿ" }).click();
  await expect(poll.locator("progress").first()).toBeVisible();
  await expect(poll.getByRole("status")).toContainText("ಸಾಧನ");
  await page.goto("/quizzes");
  await page.locator("#main a.utility-panel").first().click();
  await expect(page.locator("#main fieldset")).toHaveCount(2);
  for (const fieldset of await page.locator("#main fieldset").all())
    await fieldset.getByRole("radio").first().check();
  await page.getByRole("button", { name: "ಫಲಿತಾಂಶ ನೋಡಿ" }).click();
  await expect(page.locator("#main").getByRole("status")).toContainText("/");
});
test("obituaries suppress ads, gallery restores focus", async ({ page }) => {
  await page.goto("/notices");
  const obituary = page
    .getByRole("link", { name: /ಶ್ರದ್ಧಾಂಜಲಿ ಪ್ರಕಟಣೆಯ ಮಾದರಿ/ })
    .first();
  await expect(obituary).toBeVisible();
  {
    await obituary.click();
    await expect(page.locator("#main [data-ad-placement]")).toHaveCount(0);
  }
  await page.goto("/gallery");
  await page.locator('#main a[href^="/gallery/"]').first().click();
  const button = page.locator(".gallery-button").first();
  await button.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(button).toBeFocused();
});
test("article reader preferences survive a reload", async ({ page }) => {
  await page.goto("/news/seed-shravanabelagola-heritage");
  await page
    .locator(".reading-toolbar")
    .getByRole("button", { name: "A+", exact: true })
    .click();
  await expect(page.locator("#article-body")).toHaveCSS("font-size", "22px");
  await page.reload();
  await expect(page.locator("#article-body")).toHaveCSS("font-size", "22px");
});
test("public mutations reject cross-origin requests", async ({ request }) => {
  for (const route of [
    "/api/polls/vote",
    "/api/reactions",
    "/api/community/submit",
    "/api/newsletter/subscribe",
    "/api/newsletter/confirm",
  ]) {
    expect(
      (
        await request.post(route, {
          headers: { Origin: "https://untrusted.example" },
          data: {},
        })
      ).status(),
    ).toBe(403);
  }
  expect((await request.post("/api/cron/weather")).status()).toBe(401);
});
