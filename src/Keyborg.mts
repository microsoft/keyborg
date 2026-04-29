/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { addEventListener, removeEventListener } from "./dom.mts";
import {
  disposeFocusEvent,
  KeyborgFocusInEvent,
  KEYBORG_FOCUSIN,
  setupFocusEvent,
} from "./FocusEvent.mts";

interface WindowWithKeyborg extends Window {
  __keyborg?: {
    core: KeyborgCoreHandle;
    refs: { [id: string]: Keyborg };
  };
}

// When a key from dismissKeys is pressed and the focus is not moved during
// _dismissTimeout ms, keyboard navigation mode is dismissed.
const _dismissTimeout = 500;

let _lastId = 0;

export interface KeyborgProps {
  // Keys to be used to trigger keyboard navigation mode. By default, any key
  // will trigger it. Could be limited to, for example, just Tab (or Tab and
  // arrow keys).
  triggerKeys?: number[];
  // Keys to be used to dismiss keyboard navigation mode using keyboard (in
  // addition to mouse clicks which dismiss it). For example, Esc could be used
  // to dismiss.
  dismissKeys?: number[];
}

export type KeyborgCallback = (isNavigatingWithKeyboard: boolean) => void;

/**
 * Internal handle for the per-window core state. Not part of the public API.
 *
 * Shape is part of the `__keyborg.core` slot contract: when multiple keyborg
 * majors share the same window, the second loader reads `core` set by the
 * first. Keep `isNavigatingWithKeyboard` as a writable property accessor and
 * `dispose()` as a method so older majors can still read/write state without
 * TypeError. Changes here are breaking for that interop.
 */
interface KeyborgCoreHandle {
  isNavigatingWithKeyboard: boolean;
  dispose(): void;
}

/**
 * Used to determine the keyboard navigation state.
 */
export interface Keyborg {
  /**
   * @returns Whether the user is navigating with keyboard
   */
  isNavigatingWithKeyboard(): boolean;
  /**
   * @param callback - Called when the keyboard navigation state changes
   */
  subscribe(callback: KeyborgCallback): void;
  /**
   * @param callback - Registered with subscribe
   */
  unsubscribe(callback: KeyborgCallback): void;
  /**
   * Manually set the keyboard navigation state
   */
  setVal(isNavigatingWithKeyboard: boolean): void;
}

// Augments the public Keyborg with internal methods invoked by the core's
// broadcast loop and by disposeKeyborg. Not exported.
interface KeyborgInternal extends Keyborg {
  _notify(isNavigatingWithKeyboard: boolean): void;
  _dispose(): void;
}

function createKeyborgCore(
  targetWindow: WindowWithKeyborg,
  props?: KeyborgProps,
): KeyborgCoreHandle {
  let currentTargetWindow: WindowWithKeyborg | undefined = targetWindow;
  let isNavigating = false;
  let isMouseOrTouchUsedTimer: number | undefined;
  let dismissTimer: number | undefined;
  let triggerKeys: Set<number> | undefined;
  let dismissKeys: Set<number> | undefined;

  if (props) {
    if (props.triggerKeys?.length) {
      triggerKeys = new Set(props.triggerKeys);
    }
    if (props.dismissKeys?.length) {
      dismissKeys = new Set(props.dismissKeys);
    }
  }

  const broadcast = (): void => {
    const refs = currentTargetWindow?.__keyborg?.refs;
    if (refs) {
      for (const id of Object.keys(refs)) {
        (refs[id] as KeyborgInternal)._notify(isNavigating);
      }
    }
  };

  const setNavigating = (val: boolean): void => {
    if (isNavigating !== val) {
      isNavigating = val;
      broadcast();
    }
  };

  const shouldTrigger = (e: KeyboardEvent): boolean => {
    // TODO Some rich text fields can allow Tab key for indentation so it
    // doesn't need to be a navigation key. If there is a bug regarding that
    // we should revisit.
    if (e.key === "Tab") {
      return true;
    }
    const active = currentTargetWindow?.document
      .activeElement as HTMLElement | null;
    const isTriggerKey = !triggerKeys || triggerKeys.has(e.keyCode);
    const isEditable =
      active &&
      (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.isContentEditable);
    return isTriggerKey && !isEditable;
  };

  const shouldDismiss = (e: KeyboardEvent): boolean => {
    return !!dismissKeys?.has(e.keyCode);
  };

  const scheduleDismiss = (): void => {
    const targetWindow = currentTargetWindow;
    if (!targetWindow) {
      return;
    }
    if (dismissTimer) {
      targetWindow.clearTimeout(dismissTimer);
      dismissTimer = undefined;
    }
    const previousActiveElement = targetWindow.document.activeElement;
    dismissTimer = targetWindow.setTimeout(() => {
      dismissTimer = undefined;
      const currentActiveElement = targetWindow.document.activeElement;
      if (
        previousActiveElement &&
        currentActiveElement &&
        previousActiveElement === currentActiveElement
      ) {
        // Esc was pressed, currently focused element hasn't changed.
        // Just dismiss the keyboard navigation mode.
        setNavigating(false);
      }
    }, _dismissTimeout);
  };

  const onFocusIn = (e: KeyborgFocusInEvent): void => {
    // When the focus is moved not programmatically and without keydown events,
    // it is likely that the focus is moved by screen reader (as it might
    // swallow the events when the screen reader shortcuts are used). The
    // screen reader usage is keyboard navigation.
    if (isMouseOrTouchUsedTimer) {
      return;
    }
    if (isNavigating) {
      return;
    }
    const details = e.detail;
    if (!details.relatedTarget) {
      return;
    }
    if (
      details.isFocusedProgrammatically ||
      details.isFocusedProgrammatically === undefined
    ) {
      return;
    }
    setNavigating(true);
  };

  const onMouseOrTouch = (): void => {
    if (currentTargetWindow) {
      if (isMouseOrTouchUsedTimer) {
        currentTargetWindow.clearTimeout(isMouseOrTouchUsedTimer);
      }
      isMouseOrTouchUsedTimer = currentTargetWindow.setTimeout(() => {
        isMouseOrTouchUsedTimer = undefined;
      }, 1000);
    }
    setNavigating(false);
  };

  const onMouseDown = (e: MouseEvent): void => {
    if (
      e.buttons === 0 ||
      (e.clientX === 0 && e.clientY === 0 && e.screenX === 0 && e.screenY === 0)
    ) {
      // This is most likely an event triggered by the screen reader to
      // perform an action on an element, do not dismiss the keyboard
      // navigation mode.
      return;
    }
    onMouseOrTouch();
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (isNavigating) {
      if (shouldDismiss(e)) {
        scheduleDismiss();
      }
    } else if (shouldTrigger(e)) {
      setNavigating(true);
    }
  };

  const targetDocument = targetWindow.document;
  addEventListener(targetDocument, KEYBORG_FOCUSIN, onFocusIn as EventListener);
  addEventListener(targetDocument, "mousedown", onMouseDown as EventListener);
  addEventListener(targetWindow, "keydown", onKeyDown as EventListener);
  addEventListener(targetDocument, "touchstart", onMouseOrTouch);
  addEventListener(targetDocument, "touchend", onMouseOrTouch);
  addEventListener(targetDocument, "touchcancel", onMouseOrTouch);

  setupFocusEvent(targetWindow);

  const dispose = (): void => {
    if (!currentTargetWindow) {
      return;
    }
    if (isMouseOrTouchUsedTimer) {
      currentTargetWindow.clearTimeout(isMouseOrTouchUsedTimer);
      isMouseOrTouchUsedTimer = undefined;
    }
    if (dismissTimer) {
      currentTargetWindow.clearTimeout(dismissTimer);
      dismissTimer = undefined;
    }
    disposeFocusEvent(currentTargetWindow);
    const targetDocument = currentTargetWindow.document;
    removeEventListener(
      targetDocument,
      KEYBORG_FOCUSIN,
      onFocusIn as EventListener,
    );
    removeEventListener(
      targetDocument,
      "mousedown",
      onMouseDown as EventListener,
    );
    removeEventListener(
      currentTargetWindow,
      "keydown",
      onKeyDown as EventListener,
    );
    removeEventListener(targetDocument, "touchstart", onMouseOrTouch);
    removeEventListener(targetDocument, "touchend", onMouseOrTouch);
    removeEventListener(targetDocument, "touchcancel", onMouseOrTouch);
    currentTargetWindow = undefined;
  };

  return {
    dispose,
    get isNavigatingWithKeyboard() {
      return isNavigating;
    },
    set isNavigatingWithKeyboard(val: boolean) {
      setNavigating(val);
    },
  };
}

export function createKeyborg(win: Window, props?: KeyborgProps): Keyborg {
  const kwin = win as WindowWithKeyborg;
  const id = "k" + ++_lastId;
  let localWin: WindowWithKeyborg | undefined = kwin;
  let core: KeyborgCoreHandle | undefined;
  let callbacks: KeyborgCallback[] = [];

  const existing = kwin.__keyborg;
  if (existing) {
    core = existing.core;
  } else {
    core = createKeyborgCore(kwin, props);
  }

  const instance: KeyborgInternal = {
    isNavigatingWithKeyboard() {
      return !!core?.isNavigatingWithKeyboard;
    },
    subscribe(callback) {
      callbacks.push(callback);
    },
    unsubscribe(callback) {
      const index = callbacks.indexOf(callback);
      if (index >= 0) {
        callbacks.splice(index, 1);
      }
    },
    setVal(val) {
      if (core) {
        core.isNavigatingWithKeyboard = val;
      }
    },
    _notify(val) {
      callbacks.forEach((cb) => cb(val));
    },
    _dispose() {
      const wkb = localWin?.__keyborg;
      if (wkb?.refs[id]) {
        delete wkb.refs[id];
        if (Object.keys(wkb.refs).length === 0) {
          wkb.core.dispose();
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          delete localWin!.__keyborg;
        }
      } else if (process.env.NODE_ENV !== "production") {
        console.error(`Keyborg instance ${id} is being disposed incorrectly.`);
      }
      callbacks = [];
      core = undefined;
      localWin = undefined;
    },
  };

  if (existing) {
    existing.refs[id] = instance;
  } else {
    kwin.__keyborg = {
      core,
      refs: { [id]: instance },
    };
  }

  return instance;
}

export function disposeKeyborg(instance: Keyborg): void {
  (instance as KeyborgInternal)._dispose();
}
