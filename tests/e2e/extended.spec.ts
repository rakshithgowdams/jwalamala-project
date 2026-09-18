import { test, expect } from "@playwright/test";
test("interface language changes without translating article content", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/news/seed-shravanabelagola-heritage");
  await page
    .getByRole("combobox", { name: "Interface language" })
    .selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en", {
    timeout: 15000,
  });
  await expect(
    page
      .locator(".category-nav")
      .getByRole("link", { name: "Home", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".article-actions")
      .getByRole("button", { name: "Save", exact: true }),
  ).toBeVisible();
  await expect(page.locator("h1")).toContainText("ಶ್ರವಣಬೆಳಗೊಳ");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
test("support is honestly unavailable until configured", async ({ page }) => {
  await page.goto("/support");
  await expect(page.locator("#main h1")).toBeVisible();
  await expect(page.locator("#main")).toContainText("ಇನ್ನೂ ಆರಂಭವಾಗಿಲ್ಲ");
  await expect(page.locator('script[src*="checkout.razorpay"]')).toHaveCount(0);
});
test("AMP story is standalone and sample content remains noindex", async ({
  request,
}) => {
  const response = await request.get("/stories/heritage-story/amp");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("<html amp");
  expect(html).toContain("amp-story standalone");
  expect(html).toContain('content="noindex,nofollow"');
  expect(html).not.toContain("__next");
});
test("new public mutations enforce origin before authorization", async ({
  request,
}) => {
  for (const route of [
    "/api/support/checkout",
    "/api/support/verify",
    "/api/support/cancel",
    "/api/comments",
    "/api/comments/report",
    "/api/push/preferences",
    "/api/push/click",
  ]) {
    expect(
      (
        await request.post(route, {
          headers: { Origin: "https://untrusted.example" },
          data: {},
        })
      ).status(),
      route,
    ).toBe(403);
  }
});
