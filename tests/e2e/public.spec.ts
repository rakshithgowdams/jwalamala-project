import { test, expect } from "@playwright/test";
test("homepage, logo and responsive layout", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "kn");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "ಶ್ರವಣಬೆಳಗೊಳ",
  );
  await expect(page.locator(".sample-notice")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const wordmark = await page.locator(".wordmark").boundingBox();
  const live = await page.locator(".masthead-actions .button").boundingBox();
  expect(
    wordmark && live && wordmark.x + wordmark.width <= live.x,
  ).toBeTruthy();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator("img").evaluateAll((images) =>
    images.forEach((img) => {
      if (img instanceof HTMLImageElement) img.loading = "eager";
    }),
  );
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images).map((img) => img.decode().catch(() => {})),
    );
  });
  await page.screenshot({
    path: "test-results/home-" + testInfo.project.name + ".png",
    fullPage: true,
  });
  await page.screenshot({
    path: "test-results/home-" + testInfo.project.name + "-viewport.png",
  });
});
test("Latin search returns Kannada content", async ({ page }) => {
  await page.goto("/search");
  await page.locator("#q").fill("shravanabelagola");
  await page.locator(".search-field button").click();
  await expect(page.locator(".news-card").first()).toContainText("ಶ್ರವಣಬೆಳಗೊಳ");
});
test("event-date filter and empty result", async ({ page }) => {
  await page.goto("/search?mode=event_date");
  await page.locator('[name="from"]').fill("2026-09-14");
  await page.locator('[name="to"]').fill("2026-09-14");
  await page.locator(".filter-row button").click();
  await expect(page.locator(".news-card")).toHaveCount(2);
  await page.goto("/search?q=zzznothingmatcheszzz");
  await expect(page.locator(".empty-state")).toBeVisible();
});
test("article shows event and publication dates; saving needs login", async ({
  page,
}) => {
  await page.goto("/news/seed-shravanabelagola-heritage");
  await expect(page.locator(".article-dates")).toContainText(
    "14 ಸೆಪ್ಟೆಂಬರ್ 2026",
  );
  await expect(page.locator(".article-dates")).toContainText(
    "16 ಸೆಪ್ಟೆಂಬರ್ 2026",
  );
  await page
    .locator(".article-actions")
    .getByRole("button", { name: "ಉಳಿಸಿ", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?next=/);
});
test("category and calendar interactions", async ({ page }) => {
  await page.goto("/category/basadi");
  await expect(page.locator(".news-card")).toHaveCount(6);
  await page.goto("/events");
  await page.getByRole("button", { name: "2026-09-24", exact: true }).click();
  await expect(page.locator(".event-list .event-card")).toHaveCount(1);
  await page.getByRole("button", { name: "ಮುಂದೆ", exact: true }).click();
  await expect(page.locator(".calendar-header")).toContainText("ಅಕ್ಟೋಬರ್");
});
test("private routes redirect and API denies unauthenticated calls", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
  expect((await request.post("/api/revalidate")).status()).toBe(401);
});
test("manifest and offline page", async ({ page, context, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.lang).toBe("kn");
  expect(
    manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable"),
  ).toBe(true);
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {
      timeout: 20000,
    })
    .toBe(true);
  await page.goto("/news/seed-shravanabelagola-heritage");
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "ಶ್ರವಣಬೆಳಗೊಳ",
  );
  await page.goto("/news/not-previously-cached");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "ಆಫ್‌ಲೈನ್",
  );
  await context.setOffline(false);
});
