import { test, expect } from "@playwright/test";

test("Buttons scenario", async ({ page }) => {
  await page.goto("/?mode=preview&story=focus-behavior--buttons");

  await expect(page.getByTestId("keyboard-mode")).toContainText("false");

  // Click the button [nav by mouse]
  await page.getByText("Button A").click();
  await expect(page.getByTestId("keyboard-mode")).toContainText("false");

  // Press Tab [nav by keyboard]
  await page.keyboard.press("Tab");

  expect(await page.locator("*:focus")).toHaveText("Button B");
  await expect(page.getByTestId("keyboard-mode")).toContainText("true");

  // Press Tab [nav by keyboard]
  await page.keyboard.press("Tab");

  expect(await page.locator("*:focus")).toHaveText("Button C");
  await expect(page.getByTestId("keyboard-mode")).toContainText("true");

  // Click the button [nav by mouse]
  await page.getByText("Button B").click();
  await expect(page.getByTestId("keyboard-mode")).toContainText("false");
});
