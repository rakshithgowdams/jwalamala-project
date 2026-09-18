import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("public reading and login pages pass automated WCAG checks", async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const path of [
    "/",
    "/login",
    "/news/seed-shravanabelagola-heritage",
    "/weather",
  ]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      report.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
      path,
    ).toEqual([]);
  }
});
test("weather place selection persists", async ({ page }) => {
  await page.goto("/weather");
  const weatherMenu = page.locator(".weather-menu summary");
  await weatherMenu.click();
  const panel = page.locator(".weather-popover");
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await weatherMenu.click();
  const select = page.locator("#main select").first();
  await expect(select).toBeVisible();
  await expect(select.locator("option").nth(1)).toBeAttached();
  const options = await select
    .locator("option")
    .evaluateAll((elements) =>
      elements.map((e) => (e as HTMLOptionElement).value),
    );
  const selected = options.find((v) => v !== "bengaluru-urban")!;
  await select.selectOption(selected);
  await expect(page).toHaveURL(new RegExp("place=" + selected));
  await page.goto("/weather");
  await expect(page.locator("#main select").first()).toHaveValue(selected);
});
