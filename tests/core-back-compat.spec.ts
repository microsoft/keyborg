/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { test, expect } from "@playwright/test";

import type { createKeyborg, disposeKeyborg } from "../src/index.mts";

interface ForeignCore {
  isNavigatingWithKeyboard: boolean;
  dispose(): void;
}

interface WindowWithKeyborgFactory extends Window {
  createKeyborg?: typeof createKeyborg;
  disposeKeyborg?: typeof disposeKeyborg;
  __keyborg?: {
    core: ForeignCore;
    refs: Record<string, unknown>;
  };
}

// Verifies that `createKeyborg` interoperates with a foreign `__keyborg.core`
// using a property-accessor `isNavigatingWithKeyboard` and a `dispose()`
// method. This is the slot-shape contract that lets multiple keyborg majors
// coexist on the same window.
test("createKeyborg interops with foreign __keyborg.core", async ({ page }) => {
  await page.goto("/iframe.html?id=core-back-compat--default");
  await expect(page.getByTestId("fixture")).toBeVisible();

  const result = await page.evaluate(() => {
    const win = window as WindowWithKeyborgFactory;
    const create = win.createKeyborg;
    const dispose = win.disposeKeyborg;

    if (!create || !dispose) {
      throw new Error("keyborg factories not exposed by fixture");
    }

    let foreignNav = false;
    let setterCount = 0;
    let disposed = false;

    win.__keyborg = {
      core: {
        get isNavigatingWithKeyboard() {
          return foreignNav;
        },
        set isNavigatingWithKeyboard(val: boolean) {
          if (foreignNav !== val) {
            foreignNav = val;
            setterCount++;
          }
        },
        dispose() {
          disposed = true;
        },
      },
      refs: {},
    };

    const k = create(window);
    const initialRead = k.isNavigatingWithKeyboard();

    k.setVal(true);
    const afterSetTrueForeign = foreignNav;
    const afterSetTrueRead = k.isNavigatingWithKeyboard();

    k.setVal(false);
    const afterSetFalseForeign = foreignNav;

    dispose(k);

    return {
      initialRead,
      afterSetTrueForeign,
      afterSetTrueRead,
      afterSetFalseForeign,
      setterCount,
      disposed,
      slotCleared: !win.__keyborg,
    };
  });

  expect(result.initialRead).toBe(false);
  expect(result.afterSetTrueForeign).toBe(true);
  expect(result.afterSetTrueRead).toBe(true);
  expect(result.afterSetFalseForeign).toBe(false);
  expect(result.setterCount).toBe(2);
  expect(result.disposed).toBe(true);
  expect(result.slotCleared).toBe(true);
});

// Verifies the inverse: when keyborg owns the slot, `__keyborg.core` exposes
// a writable `isNavigatingWithKeyboard` property accessor — what an older
// keyborg sharing the window would read and write.
test("__keyborg.core exposes property-accessor shape", async ({ page }) => {
  await page.goto("/iframe.html?id=core-back-compat--default");
  await expect(page.getByTestId("fixture")).toBeVisible();

  const result = await page.evaluate(() => {
    const win = window as WindowWithKeyborgFactory;
    const create = win.createKeyborg;
    const dispose = win.disposeKeyborg;

    if (!create || !dispose) {
      throw new Error("keyborg factories not exposed by fixture");
    }

    const k = create(window);
    const slot = win.__keyborg;

    if (!slot) {
      throw new Error("expected createKeyborg to populate window.__keyborg");
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      slot.core,
      "isNavigatingWithKeyboard",
    );

    const initial = slot.core.isNavigatingWithKeyboard;
    slot.core.isNavigatingWithKeyboard = true;
    const afterWrite = slot.core.isNavigatingWithKeyboard;
    const instanceRead = k.isNavigatingWithKeyboard();

    dispose(k);

    return {
      hasGetter: typeof descriptor?.get === "function",
      hasSetter: typeof descriptor?.set === "function",
      initial,
      afterWrite,
      instanceRead,
    };
  });

  expect(result.hasGetter).toBe(true);
  expect(result.hasSetter).toBe(true);
  expect(result.initial).toBe(false);
  expect(result.afterWrite).toBe(true);
  expect(result.instanceRead).toBe(true);
});
