/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { off, on } from "./dom.mts";

export const KEYBORG_FOCUSIN = "keyborg:focusin";
export const KEYBORG_FOCUSOUT = "keyborg:focusout";

interface KeyborgFocus {
  // Retained so the native `focus` can be restored when keyborg is disposed.
  // Short key — internal, never read by any external consumer.
  _n?: (options?: FocusOptions | undefined) => void;
}

// Internal data bag stored on `window.__keyborgData`. Keys are abbreviated:
// nothing outside this module reads them, so shortening them is free bytes.
interface KeyborgFocusEventData {
  _fi: EventListener;
  _fo: EventListener;
  _lfp?: WeakRef<HTMLElement>;
  _st: Set<WeakRef<ShadowRoot>>;
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
  originalEvent?: FocusEvent;
}

export interface KeyborgFocusInEvent
  extends CustomEvent<KeyborgFocusInEventDetails> {
  /**
   * @deprecated - used `event.detail`
   */
  details?: KeyborgFocusInEventDetails;
}

export interface KeyborgFocusOutEventDetails {
  originalEvent: FocusEvent;
}

export type KeyborgFocusOutEvent = CustomEvent<KeyborgFocusOutEventDetails>;

/**
 * Guarantees that the native `focus` will be used
 */
export function nativeFocus(element: HTMLElement): void {
  const focus = element.focus as KeyborgFocus;

  if (focus._n) {
    focus._n.call(element);
  } else {
    element.focus();
  }
}

/**
 * Overrides the native `focus` and setups the keyborg focus event
 */
export function setupFocusEvent(win: Window): void {
  const kwin = win as WindowWithKeyborgFocusEvent;
  const doc = kwin.document;
  const proto = kwin.HTMLElement.prototype;

  if (!_canOverrideNativeFocus) {
    _canOverrideNativeFocus = canOverrideNativeFocus(kwin);
  }

  const origFocus = proto.focus;

  if ((origFocus as KeyborgFocus)._n) {
    // Already set up.
    return;
  }

  proto.focus = focus;

  const shadowTargets: Set<WeakRef<ShadowRoot>> = new Set();

  const focusOutHandler: EventListener = (e) => {
    const target = (e as FocusEvent).target as HTMLElement;

    if (!target) {
      return;
    }

    const event: KeyborgFocusOutEvent = new CustomEvent(KEYBORG_FOCUSOUT, {
      cancelable: true,
      bubbles: true,
      // Allows the event to bubble past an open shadow root
      composed: true,
      detail: {
        originalEvent: e as FocusEvent,
      },
    });

    target.dispatchEvent(event);
  };

  const focusInHandler: EventListener = (e) => {
    const focusEvent = e as FocusEvent;
    const target = focusEvent.target as HTMLElement;

    if (!target) {
      return;
    }

    let node: Node | null | undefined = focusEvent.composedPath()[0] as
      | Node
      | null
      | undefined;

    const currentShadows: Set<ShadowRoot> = new Set();

    while (node) {
      if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        currentShadows.add(node as ShadowRoot);
        node = (node as ShadowRoot).host;
      } else {
        node = node.parentNode;
      }
    }

    for (const shadowRootWeakRef of shadowTargets) {
      const shadowRoot = shadowRootWeakRef.deref();

      if (!shadowRoot || !currentShadows.has(shadowRoot)) {
        shadowTargets.delete(shadowRootWeakRef);

        if (shadowRoot) {
          off(shadowRoot, "focusin", focusInHandler);
          off(shadowRoot, "focusout", focusOutHandler);
        }
      }
    }

    onFocusIn(
      target,
      (focusEvent.relatedTarget as HTMLElement | null) || undefined,
    );
  };

  const onFocusIn = (
    target: Element,
    relatedTarget?: HTMLElement,
    originalEvent?: FocusEvent,
  ) => {
    const shadowRoot = target.shadowRoot;

    if (shadowRoot) {
      /**
       * https://bugs.chromium.org/p/chromium/issues/detail?id=1512028
       * focusin events don't bubble up through an open shadow root once focus is inside
       * once focus moves into a shadow root - we drop the same focusin handler there
       * keyborg's custom event will still bubble up since it is composed
       * event handlers should be cleaned up once focus leaves the shadow root.
       *
       * When a focusin event is dispatched from a shadow root, its target is the shadow root parent.
       * Each shadow root encounter requires a new capture listener.
       * Why capture? - we want to follow the focus event in order or descending nested shadow roots
       * When there are no more shadow root targets - dispatch the keyborg:focusin event
       */

      for (const shadowRootWeakRef of shadowTargets) {
        if (shadowRootWeakRef.deref() === shadowRoot) {
          return;
        }
      }

      on(shadowRoot, "focusin", focusInHandler);
      on(shadowRoot, "focusout", focusOutHandler);

      shadowTargets.add(new WeakRef(shadowRoot));

      return;
    }

    const details: KeyborgFocusInEventDetails = {
      relatedTarget,
      originalEvent,
    };

    const event: KeyborgFocusInEvent = new CustomEvent(KEYBORG_FOCUSIN, {
      cancelable: true,
      bubbles: true,
      // Allows the event to bubble past an open shadow root
      composed: true,
      detail: details,
    });

    // Tabster (and other users) can still use the legacy details field - keeping for backwards compat
    event.details = details;

    if (_canOverrideNativeFocus || data._lfp) {
      details.isFocusedProgrammatically = target === data._lfp?.deref();

      data._lfp = undefined;
    }

    target.dispatchEvent(event);
  };

  const data: KeyborgFocusEventData = (kwin.__keyborgData = {
    _fi: focusInHandler,
    _fo: focusOutHandler,
    _st: shadowTargets,
  });

  on(doc, "focusin", focusInHandler);
  on(doc, "focusout", focusOutHandler);

  function focus(this: HTMLElement) {
    const d = (kwin as WindowWithKeyborgFocusEvent).__keyborgData;

    if (d) {
      d._lfp = new WeakRef(this);
    }

    // eslint-disable-next-line prefer-rest-params
    return origFocus.apply(this, arguments);
  }

  let activeElement = doc.activeElement as Element | null;

  // If keyborg is created with the focus inside shadow root, we need
  // to go through the shadows up to make sure all relevant shadows
  // have focus handlers attached.
  while (activeElement && activeElement.shadowRoot) {
    onFocusIn(activeElement);
    activeElement = activeElement.shadowRoot.activeElement;
  }

  (focus as KeyborgFocus)._n = origFocus;
}

/**
 * Removes keyborg event listeners and custom focus override
 * @param win The window that stores keyborg focus events
 */
export function disposeFocusEvent(win: Window): void {
  const kwin = win as WindowWithKeyborgFocusEvent;
  const proto = kwin.HTMLElement.prototype;
  const origFocus = (proto.focus as KeyborgFocus)._n;
  const data = kwin.__keyborgData;

  if (data) {
    off(kwin.document, "focusin", data._fi);
    off(kwin.document, "focusout", data._fo);

    for (const shadowRootWeakRef of data._st) {
      const shadowRoot = shadowRootWeakRef.deref();

      if (shadowRoot) {
        off(shadowRoot, "focusin", data._fi);
        off(shadowRoot, "focusout", data._fo);
      }
    }

    data._st.clear();

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
  win: Window,
): HTMLElement | null | undefined {
  const data = (win as WindowWithKeyborgFocusEvent).__keyborgData;

  return data ? data._lfp?.deref() || null : undefined;
}
