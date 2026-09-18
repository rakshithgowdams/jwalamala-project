import { test, expect } from "@playwright/test";

test("GSAP reveals cards on scroll, staggers groups and adds pointer feedback", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/news");
  await expect(page.locator("html")).toHaveAttribute(
    "data-motion-engine",
    "gsap",
  );
  const cards = page.locator(".news-card");
  await expect(cards.first()).toHaveAttribute("data-motion-item", "card");
  const last = cards.last();
  await expect(last).toHaveAttribute("data-motion-state", "waiting");
  await last.scrollIntoViewIfNeeded();
  await expect(last).toHaveAttribute("data-motion-state", "ready");
  // Real GSAP transforms must be present mid-animation, not just CSS class names.
  await page.evaluate(() => {
    const root = document.querySelector(".news-grid")!;
    root.scrollIntoView();
    const group = document.createElement("div");
    group.className = "news-grid motion-test-group";
    group.innerHTML =
      '<article data-motion="card">Motion A</article><article data-motion="card">Motion B</article>';
    root.prepend(group);
  });
  const injected = page.locator(".motion-test-group article");
  // Mobile scroll anchoring can keep the existing card in view after prepend.
  // Explicitly reveal the new group before asserting its entrance animation.
  await injected.first().scrollIntoViewIfNeeded();
  await expect(injected.first()).toHaveAttribute(
    "data-motion-state",
    "revealing",
  );
  expect(
    await injected.first().evaluate((el) => getComputedStyle(el).transform),
  ).not.toBe("none");
  await expect(injected.last()).toHaveAttribute("data-motion-state", "ready");
  if (testInfo.project.name === "desktop") {
    await cards.first().scrollIntoViewIfNeeded();
    await expect(cards.first()).toHaveAttribute("data-motion-state", "ready");
    await cards.first().hover();
    await expect(cards.first()).toHaveAttribute("data-motion-hover", "true");
    await expect
      .poll(() =>
        cards
          .first()
          .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42),
      )
      .toBeLessThan(-5);
    await page.mouse.move(0, 0);
    await expect(cards.first()).toHaveAttribute("data-motion-hover", "false");
  }
  await page.locator(".motion-test-group").evaluate((el) => el.remove());
  await page.screenshot({
    path: `test-results/gsap-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("motion responds to reduced-motion changes and does not animate ad units", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/news");
  await expect(page.locator("html")).toHaveAttribute(
    "data-motion-engine",
    "gsap",
  );
  expect(
    await page
      .locator(".ad-slot [data-motion-item],.ad-slot[data-motion-item]")
      .count(),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-motion-engine",
    "gsap",
  );
  const card = page.locator(".news-card").first();
  await expect(card).not.toHaveAttribute("data-motion-item", "card");
  expect(await card.evaluate((el) => getComputedStyle(el).transform)).toBe(
    "none",
  );
  expect(await card.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveAttribute(
    "data-motion-engine",
    "gsap",
  );
});

test("motion covers component families and remains active after navigation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [path, selector] of [
    ["/", ".hero-story"],
    ["/events", ".event-card"],
    ["/basadis", ".community-card"],
    ["/gallery", ".collection-card"],
    ["/login", ".auth-card"],
    ["/weather", ".utility-panel"],
  ]) {
    await page.goto(path);
    const target = page.locator(selector).first();
    await target.scrollIntoViewIfNeeded();
    await expect(target).toHaveAttribute("data-motion-item", /card|section/);
    await expect(target).toHaveAttribute("data-motion-state", "ready");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.locator(".hamburger-trigger").click();
  await page.getByRole("dialog").locator('a[href="/news"]').click();
  await expect(page).toHaveURL(/\/news$/);
  await expect(page.locator(".news-card").first()).toHaveAttribute(
    "data-motion-item",
    "card",
  );
  expect(errors).toEqual([]);
});
