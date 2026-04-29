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

interface ForeignInstance {
  _cb: ((val: boolean) => void)[];
  dispose?: () => void;
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

// Forward direction: when keyborg owns the slot, its broadcast loop must
// notify foreign-version instances sitting in `refs`. Foreign instances
// expose callbacks as `_cb: ((val) => void)[]` (the 2.6.0 wire protocol).
test("__keyborg.refs broadcast notifies foreign instances via _cb", async ({
  page,
}) => {
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

    const seen: boolean[] = [];
    const foreign: ForeignInstance = {
      _cb: [(val) => seen.push(val)],
    };
    slot.refs["foreign"] = foreign;

    slot.core.isNavigatingWithKeyboard = true;
    slot.core.isNavigatingWithKeyboard = false;

    delete slot.refs["foreign"];
    dispose(k);

    return { seen };
  });

  expect(result.seen).toEqual([true, false]);
});

// Reverse direction (the original crash repro): a foreign core owns the slot
// and broadcasts state changes via the 2.6.0 protocol — iterating `refs` and
// calling `instance._cb.forEach(cb => cb(val))`. The new instance must expose
// a `_cb` array reflecting `subscribe`/`unsubscribe`.
test("foreign core broadcasting via old protocol notifies new subscribers", async ({
  page,
}) => {
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
    let foreignDisposed = false;
    const foreignCore: ForeignCore = {
      get isNavigatingWithKeyboard() {
        return foreignNav;
      },
      set isNavigatingWithKeyboard(val: boolean) {
        if (foreignNav !== val) {
          foreignNav = val;
          const refs = win.__keyborg?.refs;
          if (refs) {
            for (const id of Object.keys(refs)) {
              (refs[id] as ForeignInstance)._cb.forEach((cb) => cb(foreignNav));
            }
          }
        }
      },
      dispose() {
        foreignDisposed = true;
      },
    };

    win.__keyborg = { core: foreignCore, refs: {} };

    const k = create(window);
    const seen: boolean[] = [];
    const subscriber = (val: boolean) => seen.push(val);
    k.subscribe(subscriber);

    foreignCore.isNavigatingWithKeyboard = true;
    foreignCore.isNavigatingWithKeyboard = false;

    k.unsubscribe(subscriber);
    foreignCore.isNavigatingWithKeyboard = true;

    dispose(k);

    return { seen, foreignDisposed };
  });

  // Only the two flips before unsubscribe should be observed.
  expect(result.seen).toEqual([true, false]);
  expect(result.foreignDisposed).toBe(true);
});

// 2.6.0's static `Keyborg.dispose(instance)` calls `instance.dispose()`. The
// new instance must expose `dispose` as a callable property so cross-version
// teardown does not throw.
test("__keyborg.refs[id].dispose() is callable for cross-version teardown", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=core-back-compat--default");
  await expect(page.getByTestId("fixture")).toBeVisible();

  const result = await page.evaluate(() => {
    const win = window as WindowWithKeyborgFactory;
    const create = win.createKeyborg;

    if (!create) {
      throw new Error("keyborg factories not exposed by fixture");
    }

    create(window);
    const slot = win.__keyborg;

    if (!slot) {
      throw new Error("expected createKeyborg to populate window.__keyborg");
    }

    const ids = Object.keys(slot.refs);
    const inst = slot.refs[ids[0]] as ForeignInstance;
    const hasDispose = typeof inst.dispose === "function";
    inst.dispose?.();

    return { hasDispose, slotCleared: !win.__keyborg };
  });

  expect(result.hasDispose).toBe(true);
  expect(result.slotCleared).toBe(true);
});
