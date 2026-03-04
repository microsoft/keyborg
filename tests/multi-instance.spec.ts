/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { test, expect } from "@playwright/test";

test("Two instances both reflect keyboard navigation", async ({ page }) => {
  await page.goto("/iframe.html?id=multi-instance--two-instances");

  await expect(page.getByTestId("keyboard-mode-instance-1")).toHaveText(
    "false",
  );
  await expect(page.getByTestId("keyboard-mode-instance-2")).toHaveText(
    "false",
  );

  // Click a button [nav by mouse]
  await page.getByText("Button A").click();
  await expect(page.getByTestId("keyboard-mode-instance-1")).toHaveText(
    "false",
  );
  await expect(page.getByTestId("keyboard-mode-instance-2")).toHaveText(
    "false",
  );

  // Press Tab [nav by keyboard]
  await page.keyboard.press("Tab");

  await expect(page.getByTestId("keyboard-mode-instance-1")).toHaveText("true");
  await expect(page.getByTestId("keyboard-mode-instance-2")).toHaveText("true");

  // Click the button [nav by mouse]
  await page.getByText("Button A").click();
  await expect(page.getByTestId("keyboard-mode-instance-1")).toHaveText(
    "false",
  );
  await expect(page.getByTestId("keyboard-mode-instance-2")).toHaveText(
    "false",
  );
});
