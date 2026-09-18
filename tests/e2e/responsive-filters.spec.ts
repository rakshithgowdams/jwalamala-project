import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("hamburger is icon-only, keyboard accessible and visible after scrolling categories", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  const trigger = page.locator(".hamburger-trigger");
  await expect(trigger).toHaveText("");
  await page.locator(".category-nav").evaluate((nav) => {
    nav.scrollLeft = nav.scrollWidth;
  });
  await expect(trigger).toBeInViewport();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('a[href="/news"]')).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    report.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.locator('a[href="/news"]').click();
  await expect(page).toHaveURL(/\/news$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
});

test("state district city filters survive reload, combine with search and clear children", async ({
  page,
}) => {
  await page.goto("/search");
  const state = page.locator('#main [name="state"]'),
    district = page.locator('#main [name="district"]'),
    city = page.locator('#main [name="city"]');
  await expect(district).toBeDisabled();
  await expect(city).toBeDisabled();
  await state.selectOption("Karnataka");
  await district.selectOption("ಹಾಸನ");
  await city.selectOption("shravanabelagola");
  await page.locator("#q").fill("ahimsa");
  await page.locator(".search-field button").click();
  await expect(page).toHaveURL(/city=shravanabelagola/);
  await expect(page.locator(".news-card")).toHaveCount(2);
  await page.reload();
  await expect(city).toHaveValue("shravanabelagola");
  await district.selectOption("ಉಡುಪಿ");
  await expect(city).toHaveValue("");
  await expect(city.locator('option[value="shravanabelagola"]')).toHaveCount(0);
  await state.selectOption("");
  await expect(district).toHaveValue("");
  await expect(city).toBeDisabled();
  await page.goto("/news?state=Maharashtra&city=shravanabelagola");
  await expect(page.locator(".news-card")).toHaveCount(0);
  await expect(page.locator(".empty-state")).toBeVisible();
  await page.goto("/news?state=Karnataka");
  await page
    .locator(".pagination")
    .getByRole("link", { name: "2", exact: true })
    .click();
  await expect(page).toHaveURL(/state=Karnataka.*page=2/);
  await expect(page.locator(".news-card")).toHaveCount(8);
});

test("location filters apply on video, category, events and community pages", async ({
  page,
}) => {
  const q = new URLSearchParams({
    state: "Karnataka",
    district: "ಹಾಸನ",
    city: "shravanabelagola",
  });
  await page.goto("/category/basadi?" + q);
  await expect(page.locator(".news-card")).toHaveCount(2);
  await page.goto("/videos?" + q);
  await expect(page.locator(".news-card")).toHaveCount(0);
  await page.goto("/events?" + q);
  await expect(page.locator(".event-card")).toHaveCount(1);
  await page.goto("/basadis?state=Unknown-state");
  await expect(page.locator(".community-card")).toHaveCount(0);
});

test("public routes fit small phone, tablet and desktop viewports", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/news",
      "/videos",
      "/category/pravachana",
      "/category/utsava",
      "/category/panchakalyana",
      "/category/chaturmasa",
      "/category/samaja",
      "/category/basadi",
      "/events",
      "/basadis",
      "/search",
      "/login",
    ]) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route + " at " + width,
      ).toBe(true);
    }
    await page.locator(".hamburger-trigger").click();
    const box = await page.getByRole("dialog").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.height).toBeLessThanOrEqual(900);
    await page.screenshot({ path: `test-results/menu-${width}.png` });
    await page.keyboard.press("Escape");
  }
  expect(errors).toEqual([]);
});

test("images show skeletons until loaded and reduced-motion disables animations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_next/image?**", async (route) => {
    await held;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const skeleton = page.locator(".hero-image .image-skeleton");
    await expect(skeleton).toBeVisible();
    expect(
      await skeleton.evaluate(
        (el) => getComputedStyle(el, "::after").animationName,
      ),
    ).toBe("none");
    release();
    await expect(page.locator(".hero-image img")).toHaveClass(/is-loaded/);
    await expect(skeleton).toHaveCount(0);
    await expect(page.locator(".news-card img").first()).toHaveAttribute(
      "loading",
      "lazy",
    );
  } finally {
    release();
  }
});
