import { test, expect } from "@playwright/test";

test("navigation between in shadow DOM", async ({ page }) => {
  await page.goto("/?mode=preview&story=shadow-dom--default");

  // Click the button [nav by mouse in shadow DOM]
  await page.getByText("Shadow DOM: Button A").click();
  await expect(page.getByTestId("keyboard-mode")).toHaveText("false");

  // Press Tab [nav by keyboard in shadow DOM]
  await page.keyboard.press("Tab");
  await expect(
    await page.getByTestId("shadow-root").locator("*:focus")
  ).toHaveText("Shadow DOM: Button B");
  await expect(page.getByTestId("keyboard-mode")).toHaveText("true");

  // Click the button [nav by mouse in shadow DOM]
  await page.getByText("Shadow DOM: Button B").click();
  await expect(page.getByTestId("keyboard-mode")).toHaveText("false");
});

test("navigation between light & shadow DOM", async ({ page }) => {
  await page.goto("/?mode=preview&story=shadow-dom--default");

  // Click the button [nav by mouse in light DOM]
  await page.getByText("Light DOM: Button A").click();
  await expect(page.getByTestId("keyboard-mode")).toHaveText("false");

  // Press Tab [nav by keyboard in light DOM]
  await page.keyboard.press("Tab");
  await expect(await page.locator("*:focus")).toHaveText("Light DOM: Button B");
  await expect(page.getByTestId("keyboard-mode")).toHaveText("true");

  // Press Tab [nav by keyboard to shadow DOM]
  await page.keyboard.press("Tab");
  await expect(
    await page.getByTestId("shadow-root").locator("*:focus")
  ).toHaveText("Shadow DOM: Button A");
  await expect(page.getByTestId("keyboard-mode")).toHaveText("true");

  // Click the button [nav by mouse in shadow DOM]
  await page.getByText("Shadow DOM: Button B").click();
  await expect(page.getByTestId("keyboard-mode")).toHaveText("false");
});

test("navigation between nested shadow roots", async ({ page }) => {
  await page.goto("/?mode=preview&story=shadow-dom--nested");

  // Click the button [nav by mouse in shadow DOM]
  await page.getByText("Shadow DOM: Button A").click();
  await expect(page.getByTestId("keyboard-mode")).toHaveText("false");

  // Press Tab [nav by keyboard in shadow DOM]
  await page.keyboard.press("Tab");
  await expect(
    await page.getByTestId("shadow-root").locator("*:focus")
  ).toHaveText("Shadow DOM: Button B");

  // Press Tab [nav by keyboard to nested shadow root]
  await page.keyboard.press("Tab");
  await expect(
    await page.getByTestId("nested-shadow-root").locator("*:focus")
  ).toHaveText("Shadow DOM: Button C");

  // Click the button [nav by mouse in nested shadow DOM]
  await page.getByText("Shadow DOM: Button D").click();
  await expect(page.getByTestId("keyboard-mode")).toHaveText("false");
});
