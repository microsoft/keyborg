/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { test, expect } from "@playwright/test";

test("Buttons scenario", async ({ page }) => {
  await page.goto("/?mode=preview&story=focus-behavior--buttons");

  await expect(page.getByTestId("keyboard-mode")).toHaveText("false");

  // Click the button [nav by mouse]
  await page.getByText("Button A").click();
  await expect(page.getByTestId("keyboard-mode")).toHaveText("false");

  // Press Tab [nav by keyboard]
  await page.keyboard.press("Tab");

  await expect(await page.locator("*:focus")).toHaveText("Button B");
  await expect(page.getByTestId("keyboard-mode")).toHaveText("true");

  // Press Tab [nav by keyboard]
  await page.keyboard.press("Tab");

  await expect(await page.locator("*:focus")).toHaveText("Button C");
  await expect(page.getByTestId("keyboard-mode")).toHaveText("true");

  // Click the button [nav by mouse]
  await page.getByText("Button B").click();
  await expect(page.getByTestId("keyboard-mode")).toHaveText("false");
});
