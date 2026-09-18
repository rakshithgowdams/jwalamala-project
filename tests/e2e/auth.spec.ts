import { test, expect } from "@playwright/test";
import { kn } from "../../src/content/strings.kn";

test("email, Google, signup, recovery and phone options are available", async ({
  page,
}) => {
  await page.goto("/login?next=%2Fnews%2Fseed-shravanabelagola-heritage");
  await expect(
    page.getByRole("button", { name: kn.google, exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel(kn.email, { exact: true })).toHaveAttribute(
    "type",
    "email",
  );
  await expect(page.getByLabel(kn.password, { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await expect(page.getByText(kn.appPasswordHint)).toBeVisible();
  await page
    .getByRole("button", { name: kn.createAccount, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: kn.createAccount, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel(kn.confirmPassword, { exact: true }),
  ).toHaveAttribute("autocomplete", "new-password");
  await page.getByRole("button", { name: kn.backToLogin, exact: true }).click();
  await page
    .getByRole("button", { name: kn.forgotPassword, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: kn.sendReset, exact: true }),
  ).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.getByRole("button", { name: kn.phoneLogin, exact: true }).click();
  await expect(page.locator('input[type="tel"]')).toBeVisible();
  await page.getByRole("button", { name: kn.emailLogin, exact: true }).click();
  await page.getByRole("button", { name: kn.backToLogin, exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: "test-results/login-" + test.info().project.name + ".png",
    fullPage: true,
  });
});

test("failed authentication is explained and password updates require login", async ({
  page,
}) => {
  await page.goto(
    "/auth/callback?error=access_denied&next=%2Fnews%2Fseed-shravanabelagola-heritage",
  );
  await expect(page).toHaveURL(/\/login\?.*error=auth/);
  await expect(
    page.getByText(kn.authLinkFailed, { exact: true }),
  ).toBeVisible();
  await page.goto("/account/password");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fpassword/);
});

test("the profile page requires login and remembers where to return", async ({
  page,
}) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
});
