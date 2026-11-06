/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getKeyborgSlot, type WindowWithKeyborg } from "./Compatibility.mts";
import {
  KEYBORG_FOCUSIN,
  type KeyborgFocusInEvent,
  type KeyborgFocusInEventDetails,
} from "./FocusEvent.mts";
import { createKeyborgCore } from "./Keyborg.mts";
import { version } from "./index.mts";

interface WindowWithCompatibilityFocus extends Window {
  Element: typeof Element;
  __keyborgData?: [unknown, unknown, unknown, WeakRef<HTMLElement>?];
}

function createCompatibleCore(win: Window, initialState: boolean) {
  const core = createKeyborgCore(win);
  const slot = (win as WindowWithKeyborg).__keyborg;
  if (initialState && slot) {
    // Seed the new core without notifying subscribers of the preserved state.
    const refs = slot.refs;
    slot.refs = {};
    try {
      core.isNavigatingWithKeyboard = initialState;
    } finally {
      slot.refs = refs;
    }
  }

  const kwin = win as WindowWithCompatibilityFocus;
  const data = kwin.__keyborgData;
  if (data) {
    Object.defineProperty(data, "lastFocusedProgrammatically", {
      get: () => data[3],
      set: (value: WeakRef<HTMLElement> | undefined) => {
        data[3] = value;
      },
    });
  }

  // Add the legacy alias before dispatch, including for capture listeners
  // registered before compatibility was enabled.
  const proto = kwin.Element.prototype;
  const original = Object.getOwnPropertyDescriptor(proto, "dispatchEvent");
  const originalDispatch = original?.get ? undefined : proto.dispatchEvent;
  function dispatch(this: Element, event: Event): boolean {
    if (event.type === KEYBORG_FOCUSIN && "detail" in event) {
      (
        event as KeyborgFocusInEvent & { details: KeyborgFocusInEventDetails }
      ).details = (event as KeyborgFocusInEvent).detail;
    }
    const method = original?.get ? original.get.call(this) : originalDispatch;
    return method.call(this, event);
  }
  Object.defineProperty(proto, "dispatchEvent", {
    configurable: true,
    enumerable: original?.enumerable ?? false,
    writable: true,
    value: dispatch,
  });

  return {
    get isNavigatingWithKeyboard() {
      return core.isNavigatingWithKeyboard;
    },
    set isNavigatingWithKeyboard(val: boolean) {
      core.isNavigatingWithKeyboard = val;
    },
    dispose() {
      core.dispose();
      if (
        Object.getOwnPropertyDescriptor(proto, "dispatchEvent")?.value ===
        dispatch
      ) {
        if (original) {
          Object.defineProperty(proto, "dispatchEvent", original);
        } else {
          Reflect.deleteProperty(proto, "dispatchEvent");
        }
      }
    },
  };
}

/**
 * Enables legacy bundle interoperability for a window. Call once per bundle
 * that opts in, preferably before creating any Keyborg instances.
 */
export function enableKeyborgCompatibility(win: Window): void {
  getKeyborgSlot(win, version || "0.0.0", createCompatibleCore);
}
