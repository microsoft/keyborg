/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { test, expect } from "@playwright/test";

test("behavior in light DOM", async ({ page }) => {
  await page.goto("/?mode=preview&story=focus-in-event--default");

  // Click the button [nav by mouse]
  await page.getByText("Button A").click();
  await expect(await page.getByText("Button A")).not.toHaveClass(
    "focus-visible",
  );

  // Press Tab [nav by keyboard]
  await page.keyboard.press("Tab");

  await expect(await page.locator("*:focus")).toHaveText("Button B");
  await expect(await page.getByText("Button B")).toHaveClass("focus-visible");

  // Press Tab [nav by keyboard]
  await page.keyboard.press("Tab");

  await expect(await page.locator("*:focus")).toHaveText("Button C");
  await expect(await page.getByText("Button C")).toHaveClass("focus-visible");

  // Click the button [nav by mouse]
  await page.getByText("Button B").click();
  await expect(await page.getByText("Button B")).not.toHaveClass(
    "focus-visible",
  );
});

test("behavior in shadow roots", async ({ page }) => {
  await page.goto("/?story=focus-in-event--nested-shadow-roots");

  // Click the button [nav by mouse in shadow DOM]
  await page.getByText("Shadow DOM: Button A").click();
  await expect(await page.getByText("Shadow DOM: Button A")).not.toHaveClass(
    "focus-visible",
  );

  // Press Tab [nav by keyboard to shadow DOM]
  await page.keyboard.press("Tab");
  await expect(await page.getByText("Shadow DOM: Button B")).toHaveClass(
    "focus-visible",
  );

  // Press Tab [nav by keyboard to nested shadow root]
  await page.keyboard.press("Tab");
  await expect(await page.getByText("Shadow DOM: Button B")).not.toHaveClass(
    "focus-visible",
  );
  await expect(await page.getByText("Shadow DOM: Button C")).toHaveClass(
    "focus-visible",
  );

  // Click the button [nav by mouse in nested shadow DOM]
  await page.getByText("Shadow DOM: Button D").click();
  await expect(await page.getByText("Shadow DOM: Button C")).not.toHaveClass(
    "focus-visible",
  );
  await expect(await page.getByText("Shadow DOM: Button D")).not.toHaveClass(
    "focus-visible",
  );
});
