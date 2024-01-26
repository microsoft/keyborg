/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { test, expect } from "@playwright/test";
import { createKeyborg } from "../src";

test("navigation between in shadow DOM", async ({ page }) => {
  await page.goto("/?mode=preview&story=shadow-dom--default");

  // Click the button [nav by mouse in shadow DOM]
  await page.getByText("Shadow DOM: Button A").click();
  await expect(page.getByTestId("keyboard-mode")).toHaveText("false");

  // Press Tab [nav by keyboard in shadow DOM]
  await page.keyboard.press("Tab");
  await expect(
    await page.getByTestId("shadow-root").locator("*:focus"),
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
    await page.getByTestId("shadow-root").locator("*:focus"),
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
    await page.getByTestId("shadow-root").locator("*:focus"),
  ).toHaveText("Shadow DOM: Button B");

  // Press Tab [nav by keyboard to nested shadow root]
  await page.keyboard.press("Tab");
  await expect(
    await page.getByTestId("nested-shadow-root").locator("*:focus"),
  ).toHaveText("Shadow DOM: Button C");

  // Click the button [nav by mouse in nested shadow DOM]
  await page.getByText("Shadow DOM: Button D").click();
  await expect(page.getByTestId("keyboard-mode")).toHaveText("false");
});

test("create keyborg when the focus is inside ShadowDOM", async ({ page }) => {
  interface WindowWithKeyborgFocus extends Window {
    createKeyborg?: typeof createKeyborg;
    __keyborgFocusInCounter?: number;
    __keyborgFocusOutCounter?: number;
  }

  await page.goto("/?mode=preview&story=shadow-dom--lazy");

  // Click the button [nav by mouse in shadow DOM]
  await page.getByText("Shadow DOM: Button A").click();

  await page.evaluate(() => {
    // Creating keyborg when the focus is inside ShadowDOM. Then moving the focus.
    // keyborg:focusin and keyborg:focusout events should reach window.
    const win = window as WindowWithKeyborgFocus;

    win.createKeyborg?.(window);

    window.addEventListener("keyborg:focusin", () => {
      if (!win.__keyborgFocusInCounter) {
        win.__keyborgFocusInCounter = 1;
      } else {
        win.__keyborgFocusInCounter++;
      }
    });

    window.addEventListener("keyborg:focusout", () => {
      if (!win.__keyborgFocusOutCounter) {
        win.__keyborgFocusOutCounter = 1;
      } else {
        win.__keyborgFocusOutCounter++;
      }
    });
  });

  await page.keyboard.press("Tab");
  await expect(
    await page.getByTestId("shadow-root").locator("*:focus"),
  ).toHaveText("Shadow DOM: Button B");

  let keyborgFocusInCounter = await page.evaluate(
    () => (window as WindowWithKeyborgFocus).__keyborgFocusInCounter,
  );
  let keyborgFocusOutCounter = await page.evaluate(
    () => (window as WindowWithKeyborgFocus).__keyborgFocusOutCounter,
  );

  expect(keyborgFocusInCounter).toBe(1);
  expect(keyborgFocusOutCounter).toBe(1);

  await page.keyboard.press("Tab");
  await expect(
    await page.getByTestId("nested-shadow-root").locator("*:focus"),
  ).toHaveText("Shadow DOM: Button C");

  keyborgFocusInCounter = await page.evaluate(
    () => (window as WindowWithKeyborgFocus).__keyborgFocusInCounter,
  );
  keyborgFocusOutCounter = await page.evaluate(
    () => (window as WindowWithKeyborgFocus).__keyborgFocusOutCounter,
  );
  expect(keyborgFocusInCounter).toBe(2);
  expect(keyborgFocusOutCounter).toBe(2);

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  await expect(await page.getByTestId("root").locator("*:focus")).toHaveText(
    "Light DOM: Button B",
  );

  keyborgFocusInCounter = await page.evaluate(
    () => (window as WindowWithKeyborgFocus).__keyborgFocusInCounter,
  );
  keyborgFocusOutCounter = await page.evaluate(
    () => (window as WindowWithKeyborgFocus).__keyborgFocusOutCounter,
  );
  expect(keyborgFocusInCounter).toBe(5);
  // TODO: Think about triggering keyborg:focusout for ShadowDOM root.
  expect(keyborgFocusOutCounter).toBe(7);
});
