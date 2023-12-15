/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { WeakRefInstance } from "./WeakRefInstance";

export const KEYBORG_FOCUSIN = "keyborg:focusin";

interface KeyborgFocus {
  /**
   * This is the native `focus` function that is retained so that it can be restored when keyborg is disposed
   */
  __keyborgNativeFocus?: (options?: FocusOptions | undefined) => void;
}

interface KeyborgFocusEventData {
  focusInHandler: (e: FocusEvent) => void;
  lastFocusedProgrammatically?: WeakRefInstance<HTMLElement>;
}

/**
 * Extends the global window with keyborg focus event data
 */
interface WindowWithKeyborgFocusEvent extends Window {
  HTMLElement: typeof HTMLElement;
  __keyborgData?: KeyborgFocusEventData;
}

function canOverrideNativeFocus(win: Window): boolean {
  const HTMLElement = (win as WindowWithKeyborgFocusEvent).HTMLElement;
  const origFocus = HTMLElement.prototype.focus;

  let isCustomFocusCalled = false;

  HTMLElement.prototype.focus = function focus(): void {
    isCustomFocusCalled = true;
  };

  const btn = win.document.createElement("button");

  btn.focus();

  HTMLElement.prototype.focus = origFocus;

  return isCustomFocusCalled;
}

let _canOverrideNativeFocus = false;

export interface KeyborgFocusInEventDetails {
  relatedTarget?: HTMLElement;
  isFocusedProgrammatically?: boolean;
}

export type KeyborgFocusInEvent = CustomEvent<KeyborgFocusInEventDetails>;

/**
 * Guarantees that the native `focus` will be used
 */
export function nativeFocus(element: HTMLElement): void {
  const focus = element.focus as KeyborgFocus;

  if (focus.__keyborgNativeFocus) {
    focus.__keyborgNativeFocus.call(element);
  } else {
    element.focus();
  }
}

/**
 * Overrides the native `focus` and setups the keyborg focus event
 */
export function setupFocusEvent(win: Window): void {
  const kwin = win as WindowWithKeyborgFocusEvent;

  if (!_canOverrideNativeFocus) {
    _canOverrideNativeFocus = canOverrideNativeFocus(kwin);
  }

  const origFocus = kwin.HTMLElement.prototype.focus;

  if ((origFocus as KeyborgFocus).__keyborgNativeFocus) {
    // Already set up.
    return;
  }

  kwin.HTMLElement.prototype.focus = focus;

  const focusInHandler = (e: FocusEvent) => {
    let target = e.target as HTMLElement;
    if (!target) {
      return;
    }

    if (target.shadowRoot) {
      // https://bugs.chromium.org/p/chromium/issues/detail?id=1512028
      // focusin events don't bubble up through an open shadow root once focus is inside
      // once focus moves into a shadow root - we drop the same focusin handler there
      // keyborg's custom event will still bubble up since it is composed
      target.shadowRoot.removeEventListener("focusin", focusInHandler);
      target.shadowRoot.addEventListener("focusin", focusInHandler);
      target = e.composedPath()[0] as HTMLElement;
    }

    const details: KeyborgFocusInEventDetails = {
      relatedTarget: (e.relatedTarget as HTMLElement) || undefined,
    };

    const event = new CustomEvent(KEYBORG_FOCUSIN, {
      cancelable: true,
      bubbles: true,
      composed: true,
      detail: details,
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - for backwards compatibility with tabster
    event.details = details;

    if (_canOverrideNativeFocus || data.lastFocusedProgrammatically) {
      details.isFocusedProgrammatically =
        target === data.lastFocusedProgrammatically?.deref();

      data.lastFocusedProgrammatically = undefined;
    }

    target.dispatchEvent(event);
  };

  const data: KeyborgFocusEventData = (kwin.__keyborgData = {
    focusInHandler,
  });

  kwin.document.addEventListener(
    "focusin",
    kwin.__keyborgData.focusInHandler,
    true
  );

  function focus(this: HTMLElement) {
    const keyborgNativeFocusEvent = (kwin as WindowWithKeyborgFocusEvent)
      .__keyborgData;

    if (keyborgNativeFocusEvent) {
      keyborgNativeFocusEvent.lastFocusedProgrammatically = new WeakRefInstance(
        this
      );
    }

    // eslint-disable-next-line prefer-rest-params
    return origFocus.apply(this, arguments);
  }

  (focus as KeyborgFocus).__keyborgNativeFocus = origFocus;
}

/**
 * Removes keyborg event listeners and custom focus override
 * @param win The window that stores keyborg focus events
 */
export function disposeFocusEvent(win: Window): void {
  const kwin = win as WindowWithKeyborgFocusEvent;
  const proto = kwin.HTMLElement.prototype;
  const origFocus = (proto.focus as KeyborgFocus).__keyborgNativeFocus;
  const keyborgNativeFocusEvent = kwin.__keyborgData;

  if (keyborgNativeFocusEvent) {
    kwin.document.removeEventListener(
      "focusin",
      keyborgNativeFocusEvent.focusInHandler,
      true
    );
    delete kwin.__keyborgData;
  }

  if (origFocus) {
    proto.focus = origFocus;
  }
}

/**
 * @param win The window that stores keyborg focus events
 * @returns The last element focused with element.focus()
 */
export function getLastFocusedProgrammatically(
  win: Window
): HTMLElement | null | undefined {
  const keyborgNativeFocusEvent = (win as WindowWithKeyborgFocusEvent)
    .__keyborgData;

  return keyborgNativeFocusEvent
    ? keyborgNativeFocusEvent.lastFocusedProgrammatically?.deref() || null
    : undefined;
}
