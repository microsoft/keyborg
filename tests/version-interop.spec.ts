/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { expect, test } from "@playwright/test";

import type {
  LegacyVersion,
  WindowWithKeyborgModules,
} from "./version-interop.stories";

const legacyVersions: LegacyVersion[] = ["v1", "v2", "notify", "legacy", "v3"];

for (const firstVersion of legacyVersions) {
  for (const secondVersion of legacyVersions) {
    for (const legacyFirst of [false, true]) {
      test(`${firstVersion} + ${secondVersion}, ${legacyFirst ? "legacy" : "current"} initialized first`, async ({
        page,
      }) => {
        await page.goto("/iframe.html?id=version-interop--default");
        await expect(page.getByTestId("fixture")).toBeVisible();
        await page.evaluate(() => {
          const iframe = document.createElement("iframe");
          iframe.dataset.testid = "second-copy";
          iframe.src = location.href;
          document.body.append(iframe);
        });
        await expect(
          page
            .frameLocator('[data-testid="second-copy"]')
            .getByTestId("fixture"),
        ).toBeVisible();

        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (
            message.type() === "error" &&
            message.text().startsWith("Keyborg instance ")
          ) {
            errors.push(message.text());
          }
        });

        const result = await page.evaluate(
          ({ firstVersion, secondVersion, legacyFirst }) => {
            const win = window as unknown as WindowWithKeyborgModules;
            const other = (
              document.querySelector(
                '[data-testid="second-copy"]',
              ) as HTMLIFrameElement
            ).contentWindow as WindowWithKeyborgModules;
            const modules = [
              win.keyborgModules.current,
              win.keyborgModules[firstVersion],
              other.keyborgModules[secondVersion],
            ];
            const originalFocus = HTMLElement.prototype.focus;
            const originalDispatch = Element.prototype.dispatchEvent;
            const results = [];

            for (let cycle = 0; cycle < 2; cycle++) {
              const seen: boolean[][] = [[], [], []];
              const callbacks = seen.map(
                (values) => (val: boolean) => values.push(val),
              );
              const first = legacyFirst
                ? modules[1].createKeyborg(window)
                : modules[0].createKeyborg(window);
              const firstIndex = legacyFirst ? 1 : 0;
              first.subscribe(callbacks[firstIndex]);
              first.setVal(true);
              const firstCount = seen[firstIndex].length;
              win.enableKeyborgCompatibility(window);
              const next = legacyFirst
                ? modules[0].createKeyborg(window)
                : modules[1].createKeyborg(window);
              next.subscribe(callbacks[1 - firstIndex]);
              const third = modules[2].createKeyborg(window);
              third.subscribe(callbacks[2]);
              const instances = legacyFirst
                ? [next, first, third]
                : [first, next, third];

              const statePreserved = instances.every((instance) =>
                instance.isNavigatingWithKeyboard(),
              );
              const noUpgradeNotification =
                seen[firstIndex].length === firstCount;
              const bothLegacyRegistered =
                Object.values(win.__keyborg?.refs || {}).includes(
                  instances[1],
                ) &&
                Object.values(win.__keyborg?.refs || {}).includes(instances[2]);

              const change = (index: number, val: boolean) => {
                const counts = seen.map((values) => values.length);
                instances[index].setVal(val);
                return (
                  instances.every(
                    (instance) => instance.isNavigatingWithKeyboard() === val,
                  ) &&
                  seen.every(
                    (values, i) =>
                      values.length === counts[i] + 1 &&
                      values[values.length - 1] === val,
                  )
                );
              };
              const publicStateMethods =
                change(2, false) && change(1, true) && change(0, false);
              instances[1].unsubscribe(callbacks[1]);
              const unsubscribedCount = seen[1].length;
              instances[0].setVal(true);
              const unsubscribeWorks = seen[1].length === unsubscribedCount;
              instances[1].subscribe(callbacks[1]);

              const button = document.createElement("button");
              const target = document.createElement("button");
              document.body.append(button, target);
              const focusEvents: Array<{
                programmatic: boolean | undefined;
                alias: boolean;
              }> = [];
              const onFocus = (event: Event) => {
                const focus = event as CustomEvent<{
                  isFocusedProgrammatically?: boolean;
                }> & {
                  details?: { isFocusedProgrammatically?: boolean };
                };
                focusEvents.push({
                  programmatic: focus.detail.isFocusedProgrammatically,
                  alias: focus.details === focus.detail,
                });
              };
              button.addEventListener("keyborg:focusin", onFocus);
              target.addEventListener("keyborg:focusin", onFocus);
              button.focus();
              button.focus();
              const lastFocusWorks = modules.every(
                (module) =>
                  module.getLastFocusedProgrammatically(window) === button,
              );
              modules[1].nativeFocus(target);
              modules[2].nativeFocus(button);
              const focusWorks =
                JSON.stringify(
                  focusEvents.map((event) => event.programmatic),
                ) === "[true,false,false]" &&
                focusEvents.every((event) => event.alias);
              button.remove();
              target.remove();

              const order = cycle === 0 ? [0, 1, 2] : [2, 1, 0];
              let survivingStateWorks = true;
              let focusOverridePreserved = true;
              for (let i = 0; i < order.length; i++) {
                const index = order[i];
                modules[index].disposeKeyborg(instances[index]);
                const remaining = order.slice(i + 1);
                if (remaining.length) {
                  focusOverridePreserved &&=
                    HTMLElement.prototype.focus !== originalFocus;
                  instances[remaining[0]].setVal(false);
                  document.body.dispatchEvent(
                    new KeyboardEvent("keydown", {
                      key: "a",
                      keyCode: 65,
                      bubbles: true,
                    }),
                  );
                  survivingStateWorks &&= remaining.every((j) =>
                    instances[j].isNavigatingWithKeyboard(),
                  );
                }
              }
              results.push({
                statePreserved,
                noUpgradeNotification,
                bothLegacyRegistered,
                publicStateMethods,
                unsubscribeWorks,
                lastFocusWorks,
                focusWorks,
                survivingStateWorks,
                focusOverridePreserved,
                slotCleared: !win.__keyborg,
                focusRestored: HTMLElement.prototype.focus === originalFocus,
                dispatchRestored:
                  Element.prototype.dispatchEvent === originalDispatch,
              });
            }
            return results;
          },
          { firstVersion, secondVersion, legacyFirst },
        );

        for (const cycle of result) {
          expect(cycle).toEqual({
            statePreserved: true,
            noUpgradeNotification: true,
            bothLegacyRegistered: true,
            publicStateMethods: true,
            unsubscribeWorks: true,
            lastFocusWorks: true,
            focusWorks: true,
            survivingStateWorks: true,
            focusOverridePreserved: true,
            slotCleared: true,
            focusRestored: true,
            dispatchRestored: true,
          });
        }
        expect(errors).toEqual([]);
      });
    }
  }
}

test("the newest core wins without resetting state or reviving older versions", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=version-interop--default");
  await expect(page.getByTestId("fixture")).toBeVisible();

  const result = await page.evaluate(() => {
    const win = window as unknown as WindowWithKeyborgModules;
    const created: string[] = [];
    const disposed: string[] = [];
    const writes: string[] = [];
    const install = (version: string) =>
      win.getKeyborgSlot(window, version, (_, initial) => {
        created.push(version);
        let state = initial;
        return {
          get isNavigatingWithKeyboard() {
            return state;
          },
          set isNavigatingWithKeyboard(val: boolean) {
            writes.push(version);
            if (state !== val) {
              state = val;
              for (const instance of Object.values(win.__keyborg?.refs || {})) {
                instance._cb?.forEach((callback) => callback(val));
              }
            }
          },
          dispose() {
            disposed.push(version);
          },
        };
      });
    install("999.0.0-alpha.2");
    const instance = win.keyborgModules.current.createKeyborg(window);
    const seen: boolean[] = [];
    instance.subscribe((val) => seen.push(val));
    instance.setVal(true);
    install("999.0.0-alpha.10");
    const statePreserved = instance.isNavigatingWithKeyboard();
    instance.setVal(false);
    install("998.9.9");
    install("999.0.0");
    install("999.0.0+build.1");
    instance.setVal(true);
    win.keyborgModules.current.disposeKeyborg(instance);

    const legacy = win.keyborgModules.v1.createKeyborg(window);
    legacy.setVal(true);
    const restarted = legacy.isNavigatingWithKeyboard();
    win.keyborgModules.v1.disposeKeyborg(legacy);
    return { created, disposed, writes, seen, statePreserved, restarted };
  });

  expect(result.statePreserved).toBe(true);
  expect(result.restarted).toBe(true);
  expect(result.created).toEqual([
    "999.0.0-alpha.2",
    "999.0.0-alpha.10",
    "999.0.0",
    "999.0.0",
  ]);
  expect(result.disposed).toEqual(result.created);
  expect(result.writes).toEqual([
    "999.0.0-alpha.2",
    "999.0.0-alpha.10",
    "999.0.0",
    "999.0.0",
  ]);
  expect(result.seen).toEqual([true, false, true]);
});

test("V1 static methods and instance identity survive takeover", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=version-interop--default");
  await expect(page.getByTestId("fixture")).toBeVisible();
  const result = await page.evaluate(() => {
    const win = window as unknown as WindowWithKeyborgModules;
    const old = win.LegacyKeyborg.create(window);
    const seen: boolean[] = [];
    old.subscribe((val) => seen.push(val));
    old.setVal(true);
    win.enableKeyborgCompatibility(window);
    const current = win.keyborgModules.current.createKeyborg(window);
    const identityPreserved = old instanceof win.LegacyKeyborg;
    // update() only broadcasts; unlike setVal(), it does not change state.
    win.LegacyKeyborg.update(old, false);
    const state = old.isNavigatingWithKeyboard();
    win.LegacyKeyborg.dispose(old);
    current.setVal(false);
    win.keyborgModules.current.disposeKeyborg(current);
    return { seen, identityPreserved, state, cleared: !win.__keyborg };
  });
  expect(result).toEqual({
    seen: [true, false],
    identityPreserved: true,
    state: true,
    cleared: true,
  });
});

test("reassigning a live instance or the slot does not duplicate subscriptions", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=version-interop--default");
  await expect(page.getByTestId("fixture")).toBeVisible();
  const result = await page.evaluate(() => {
    const win = window as unknown as WindowWithKeyborgModules;
    const instance = win.keyborgModules.current.createKeyborg(window);
    win.enableKeyborgCompatibility(window);
    const slot = win.__keyborg;
    if (!slot) {
      throw new Error("expected a shared slot");
    }
    const seen: boolean[] = [];
    instance.subscribe((val) => seen.push(val));
    const id = Object.keys(slot.refs)[0];
    slot.refs[id] = instance;
    slot.refs.alias = instance;
    win.__keyborg = slot;
    instance.setVal(true);
    win.keyborgModules.current.disposeKeyborg(instance);
    return { seen, cleared: !win.__keyborg };
  });
  expect(result).toEqual({ seen: [true], cleared: true });
});

test("legacy and current instances keep navigation isolated per window", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=version-interop--default");
  await expect(page.getByTestId("fixture")).toBeVisible();
  const result = await page.evaluate(() => {
    const win = window as unknown as WindowWithKeyborgModules;
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const other = iframe.contentWindow;
    if (!other) {
      throw new Error("expected an iframe window");
    }
    const parent = win.keyborgModules.current.createKeyborg(window);
    const child = win.keyborgModules.current.createKeyborg(other);
    win.enableKeyborgCompatibility(window);
    const childWasNotEnabled = !(other as unknown as WindowWithKeyborgModules)
      .__keyborgCompat;
    win.enableKeyborgCompatibility(other);
    const parentLegacy = win.keyborgModules.v1.createKeyborg(window);
    const childLegacy = win.keyborgModules.v1.createKeyborg(other);
    parentLegacy.setVal(true);
    const parentOnly =
      parent.isNavigatingWithKeyboard() && !child.isNavigatingWithKeyboard();
    childLegacy.setVal(true);
    parentLegacy.setVal(false);
    const childOnly =
      child.isNavigatingWithKeyboard() && !parent.isNavigatingWithKeyboard();
    win.keyborgModules.v1.disposeKeyborg(parentLegacy);
    win.keyborgModules.current.disposeKeyborg(parent);
    const childSurvives = child.isNavigatingWithKeyboard();
    win.keyborgModules.v1.disposeKeyborg(childLegacy);
    win.keyborgModules.current.disposeKeyborg(child);
    iframe.remove();
    return { parentOnly, childOnly, childSurvives, childWasNotEnabled };
  });
  expect(result).toEqual({
    parentOnly: true,
    childOnly: true,
    childSurvives: true,
    childWasNotEnabled: true,
  });
});

test("callbacks can dispose all instances during a broadcast", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=version-interop--default");
  await expect(page.getByTestId("fixture")).toBeVisible();
  const result = await page.evaluate(() => {
    const win = window as unknown as WindowWithKeyborgModules;
    win.enableKeyborgCompatibility(window);
    const current = win.keyborgModules.current.createKeyborg(window);
    const first = win.keyborgModules.notify.createKeyborg(window);
    const second = win.keyborgModules.notify.createKeyborg(window);
    const seen: boolean[] = [];
    second.subscribe((val) => seen.push(val));
    first.subscribe(() => {
      win.keyborgModules.notify.disposeKeyborg(second);
      win.keyborgModules.current.disposeKeyborg(current);
      win.keyborgModules.notify.disposeKeyborg(first);
    });
    current.setVal(true);
    const clearedDuringBroadcast = !win.__keyborg;
    const restarted = win.keyborgModules.current.createKeyborg(window);
    restarted.setVal(true);
    const state = restarted.isNavigatingWithKeyboard();
    win.keyborgModules.current.disposeKeyborg(restarted);
    return { seen, clearedDuringBroadcast, state, cleared: !win.__keyborg };
  });
  expect(result).toEqual({
    seen: [],
    clearedDuringBroadcast: true,
    state: true,
    cleared: true,
  });
});

test("takeover replaces shadow-root listeners and final teardown removes them", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=version-interop--default");
  await expect(page.getByTestId("fixture")).toBeVisible();
  const result = await page.evaluate(() => {
    const win = window as unknown as WindowWithKeyborgModules;
    const originalFocus = HTMLElement.prototype.focus;
    const host = document.createElement("div");
    document.body.append(host);
    const root = host.attachShadow({ mode: "open" });
    const first = document.createElement("button");
    const second = document.createElement("button");
    root.append(first, second);
    const legacy = win.keyborgModules.legacy.createKeyborg(window);
    first.focus();
    win.enableKeyborgCompatibility(window);
    const current = win.keyborgModules.current.createKeyborg(window);
    let events = 0;
    root.addEventListener("keyborg:focusin", () => events++);
    second.focus();
    const afterTakeover = events;
    win.keyborgModules.current.disposeKeyborg(current);
    first.focus();
    const afterPartialDisposal = events;
    win.keyborgModules.legacy.disposeKeyborg(legacy);
    second.focus();
    host.remove();
    return {
      afterTakeover,
      afterPartialDisposal,
      afterTeardown: events,
      restored: HTMLElement.prototype.focus === originalFocus,
    };
  });
  expect(result).toEqual({
    afterTakeover: 1,
    afterPartialDisposal: 2,
    afterTeardown: 2,
    restored: true,
  });
});

test("compatibility has no import-time effects and requires explicit opt-in", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=version-interop--default");
  await expect(page.getByTestId("fixture")).toBeVisible();
  const result = await page.evaluate(() => {
    const win = window as unknown as WindowWithKeyborgModules;
    const originalDispatch = Element.prototype.dispatchEvent;
    const noImportEffects = !win.__keyborg && !win.__keyborgCompat;
    const current = win.keyborgModules.current.createKeyborg(window);
    const noAutomaticOptIn =
      !win.__keyborgCompat &&
      !Object.getOwnPropertyDescriptor(window, "__keyborg")?.get;
    const seen: boolean[] = [];
    current.subscribe((val) => seen.push(val));
    current.setVal(true);
    const aliases: boolean[] = [];
    const onFocus = (event: Event) => {
      const focus = event as CustomEvent & { details?: unknown };
      aliases.push(focus.details === focus.detail);
    };
    document.addEventListener("keyborg:focusin", onFocus, true);
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();
    button.blur();
    const defaultDispatchUnchanged =
      Element.prototype.dispatchEvent === originalDispatch;
    win.enableKeyborgCompatibility(window);
    win.enableKeyborgCompatibility(window);
    const statePreserved = current.isNavigatingWithKeyboard();
    button.focus();
    const unrelated = new CustomEvent("unrelated", {
      detail: {},
      cancelable: true,
    });
    button.addEventListener("unrelated", (event) => event.preventDefault());
    const cancellationPreserved = !button.dispatchEvent(unrelated);
    const unrelatedUntouched = !Object.hasOwn(unrelated, "details");
    win.keyborgModules.current.disposeKeyborg(current);
    document.removeEventListener("keyborg:focusin", onFocus, true);
    button.remove();
    return {
      noImportEffects,
      noAutomaticOptIn,
      defaultDispatchUnchanged,
      statePreserved,
      aliases,
      seen,
      unrelatedUntouched,
      cancellationPreserved,
      dispatchRestored: Element.prototype.dispatchEvent === originalDispatch,
    };
  });
  expect(result).toEqual({
    noImportEffects: true,
    noAutomaticOptIn: true,
    defaultDispatchUnchanged: true,
    statePreserved: true,
    aliases: [false, true],
    seen: [true],
    unrelatedUntouched: true,
    cancellationPreserved: true,
    dispatchRestored: true,
  });
});
