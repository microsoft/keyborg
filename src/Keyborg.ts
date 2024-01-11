/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  disposeFocusEvent,
  KeyborgFocusInEvent,
  KEYBORG_FOCUSIN,
  setupFocusEvent,
} from "./FocusEvent";
import { DIMISS_TIMEOUT, KEYBORG_KEYBOARDNAVIGATION } from "./constants";
import {
  Disposable,
  KeyboardNavigationEventData,
  KeyborgCallback,
  KeyborgProps,
} from "./types";

interface WindowWithKeyborg extends Window {
  __keyborg_v2?: {
    refs: Set<Keyborg>;
    core: KeyborgCore;
  };
}

/**
 * Manages a collection of Keyborg instances in a window/document and updates keyborg state
 */
class KeyborgCore implements Disposable {
  private _win?: WindowWithKeyborg;
  private _isMouseUsedTimer: number | undefined;
  private _dismissTimer: number | undefined;
  private _triggerKeys?: Set<number>;
  private _dismissKeys?: Set<number>;

  private _isNavigatingWithKeyboard_DO_NOT_USE_DIRECTLY = false;

  constructor(win: WindowWithKeyborg, props?: KeyborgProps) {
    this._win = win;
    const doc = win.document;

    if (props) {
      const triggerKeys = props.triggerKeys;
      const dismissKeys = props.dismissKeys;

      if (triggerKeys?.length) {
        this._triggerKeys = new Set(triggerKeys);
      }

      if (dismissKeys?.length) {
        this._dismissKeys = new Set(dismissKeys);
      }
    }

    doc.addEventListener(KEYBORG_FOCUSIN, this._onFocusIn, true); // Capture!
    doc.addEventListener("mousedown", this._onMouseDown, true); // Capture!
    win.addEventListener("keydown", this._onKeyDown, true); // Capture!

    setupFocusEvent(win);
  }

  get isNavigatingWithKeyboard() {
    return this._isNavigatingWithKeyboard_DO_NOT_USE_DIRECTLY;
  }

  set isNavigatingWithKeyboard(val: boolean) {
    if (
      this._isNavigatingWithKeyboard_DO_NOT_USE_DIRECTLY === val ||
      !this._win
    ) {
      return;
    }

    this._isNavigatingWithKeyboard_DO_NOT_USE_DIRECTLY = val;
    this._win.dispatchEvent(
      new CustomEvent<KeyboardNavigationEventData>(KEYBORG_KEYBOARDNAVIGATION, {
        detail: { isNavigatingWithKeyboard: val },
      }),
    );
  }

  dispose(): void {
    const win = this._win;

    if (win) {
      if (this._isMouseUsedTimer) {
        win.clearTimeout(this._isMouseUsedTimer);
        this._isMouseUsedTimer = undefined;
      }

      if (this._dismissTimer) {
        win.clearTimeout(this._dismissTimer);
        this._dismissTimer = undefined;
      }

      disposeFocusEvent(win);

      const doc = win.document;

      doc.removeEventListener(KEYBORG_FOCUSIN, this._onFocusIn, true); // Capture!
      doc.removeEventListener("mousedown", this._onMouseDown, true); // Capture!
      win.removeEventListener("keydown", this._onKeyDown, true); // Capture!

      delete this._win;
    }
  }

  isDisposed(): boolean {
    return !!this._win;
  }

  /**
   * Updates all keyborg instances with the keyboard navigation state
   */
  update(isNavigatingWithKeyboard: boolean): void {
    this._win?.dispatchEvent(
      new CustomEvent<KeyboardNavigationEventData>(KEYBORG_KEYBOARDNAVIGATION, {
        detail: { isNavigatingWithKeyboard },
      }),
    );
  }

  private _onFocusIn = (e: KeyborgFocusInEvent) => {
    // When the focus is moved not programmatically and without keydown events,
    // it is likely that the focus is moved by screen reader (as it might swallow
    // the events when the screen reader shortcuts are used). The screen reader
    // usage is keyboard navigation.

    if (this._isMouseUsedTimer) {
      // There was a mouse event recently.
      return;
    }

    if (this.isNavigatingWithKeyboard) {
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
      // The element is focused programmatically, or the programmatic focus detection
      // is not working.
      return;
    }

    this.isNavigatingWithKeyboard = true;
  };

  private _onMouseDown = (e: MouseEvent): void => {
    if (
      e.buttons === 0 ||
      (e.clientX === 0 && e.clientY === 0 && e.screenX === 0 && e.screenY === 0)
    ) {
      // This is most likely an event triggered by the screen reader to perform
      // an action on an element, do not dismiss the keyboard navigation mode.
      return;
    }

    const win = this._win;

    if (win) {
      if (this._isMouseUsedTimer) {
        win.clearTimeout(this._isMouseUsedTimer);
      }

      this._isMouseUsedTimer = win.setTimeout(() => {
        delete this._isMouseUsedTimer;
      }, 1000); // Keeping the indication of the mouse usage for some time.
    }

    this.isNavigatingWithKeyboard = false;
  };

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (this.isNavigatingWithKeyboard) {
      if (this._shouldDismissKeyboardNavigation(e)) {
        this._scheduleDismiss();
      }
    } else {
      if (this._shouldTriggerKeyboardNavigation(e)) {
        this.isNavigatingWithKeyboard = true;
      }
    }
  };

  /**
   * @returns whether the keyboard event should trigger keyboard navigation mode
   */
  private _shouldTriggerKeyboardNavigation(e: KeyboardEvent) {
    // TODO Some rich text fields can allow Tab key for indentation so it doesn't
    // need to be a navigation key. If there is a bug regarding that we should revisit
    if (e.key === "Tab") {
      return true;
    }

    const activeElement = this._win?.document
      .activeElement as HTMLElement | null;
    const isTriggerKey = !this._triggerKeys || this._triggerKeys.has(e.keyCode);

    const isEditable =
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.isContentEditable);

    return isTriggerKey && !isEditable;
  }

  /**
   * @returns whether the keyboard event should dismiss keyboard navigation mode
   */
  private _shouldDismissKeyboardNavigation(e: KeyboardEvent) {
    return this._dismissKeys?.has(e.keyCode);
  }

  private _scheduleDismiss(): void {
    const win = this._win;

    if (win) {
      if (this._dismissTimer) {
        win.clearTimeout(this._dismissTimer);
        this._dismissTimer = undefined;
      }

      const was = win.document.activeElement;

      this._dismissTimer = win.setTimeout(() => {
        this._dismissTimer = undefined;

        const cur = win.document.activeElement;

        if (was && cur && was === cur) {
          // Esc was pressed, currently focused element hasn't changed.
          // Just dismiss the keyboard navigation mode.
          this.isNavigatingWithKeyboard = false;
        }
      }, DIMISS_TIMEOUT);
    }
  }
}

/**
 * Used to determine the keyboard navigation state
 */
export class Keyborg {
  private _win?: WindowWithKeyborg;
  private _cb = new Map<
    KeyborgCallback,
    (e: CustomEvent<KeyboardNavigationEventData>) => void
  >();

  /**
   * @deprecated
   */
  static create(win: WindowWithKeyborg): Keyborg {
    return new Keyborg(win);
  }

  static dispose(instance: Keyborg): void {
    instance.dispose();
  }

  /**
   * @deprecated no longer used internally
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars, no-empty-function
  static update(instance: Keyborg, isNavigatingWithKeyboard: boolean): void {}

  constructor(win: WindowWithKeyborg) {
    this._win = win;
  }

  private dispose(): void {
    const current = this._win?.__keyborg_v2;

    if (current?.refs.has(this)) {
      current.refs.delete(this);

      if (current.refs.size === 0) {
        this._win?.__keyborg_v2?.core.dispose();
        delete this._win?.__keyborg_v2;
      }
    } else if (process.env.NODE_ENV !== "production") {
      console.error(`Keyborg instance is being disposed incorrectly.`);
    }

    this._cb = new Map();
    delete this._win;
  }

  /**
   * @returns Whether the user is navigating with keyboard
   */
  isNavigatingWithKeyboard(): boolean {
    return !!this._win?.__keyborg_v2?.core.isNavigatingWithKeyboard;
  }

  /**
   * @param callback - Called when the keyboard navigation state changes
   */
  subscribe(callback: KeyborgCallback): void {
    if (this._cb.has(callback)) {
      return;
    }

    const handler = (e: CustomEvent<KeyboardNavigationEventData>) => {
      callback(e.detail.isNavigatingWithKeyboard);
    };
    this._win?.addEventListener(KEYBORG_KEYBOARDNAVIGATION, handler);
    this._cb.set(callback, handler);
  }

  /**
   * @param callback - Registered with subscribe
   */
  unsubscribe(callback: KeyborgCallback): void {
    if (!this._cb.has(callback)) {
      return;
    }

    this._win?.removeEventListener(
      KEYBORG_KEYBOARDNAVIGATION,
      this._cb.get(callback)!,
    );
    this._cb.delete(callback);
  }

  /**
   * Manually set the keyboard navigtion state
   */
  setVal(isNavigatingWithKeyboard: boolean): void {
    if (!this._win?.__keyborg_v2) {
      return;
    }

    this._win.__keyborg_v2.core.isNavigatingWithKeyboard =
      isNavigatingWithKeyboard;
  }
}

export function createKeyborg(win: Window, props?: KeyborgProps): Keyborg {
  const keyborgWin = win as WindowWithKeyborg;
  if (!keyborgWin.__keyborg_v2) {
    keyborgWin.__keyborg_v2 = {
      core: new KeyborgCore(win, props),
      refs: new Set(),
    };
  }

  const keyborg = new Keyborg(win);
  keyborgWin.__keyborg_v2.refs.add(keyborg);

  return keyborg;
}

export function disposeKeyborg(instance: Keyborg) {
  Keyborg.dispose(instance);
}
