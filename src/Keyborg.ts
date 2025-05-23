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
import { Disposable } from "./WeakRefInstance";

interface WindowWithKeyborg extends Window {
  __keyborg?: {
    core: KeyborgCore;
    refs: { [id: string]: Keyborg };
    _lastId: number;
  };
}

const _dismissTimeout = 500; // When a key from dismissKeys is pressed and the focus is not moved
// during _dismissTimeout time, dismiss the keyboard navigation mode.

/**
 * Gets the next unique ID from the shared window.__keyborg object.
 * This ensures compatibility between different bundle versions.
 */
function getNextId(win: WindowWithKeyborg): number {
  if (!win.__keyborg) {
    // Don't initialize the full object here, just set up _lastId
    win.__keyborg = {
      core: undefined as unknown as KeyborgCore,
      refs: {},
      _lastId: 0
    };
  } else if (typeof win.__keyborg._lastId !== 'number') {
    // For compatibility with older bundles that don't have _lastId
    win.__keyborg._lastId = 0;
  }
  
  return ++win.__keyborg._lastId;
}

export interface KeyborgProps {
  // Keys to be used to trigger keyboard navigation mode. By default, any key will trigger
  // it. Could be limited to, for example, just Tab (or Tab and arrow keys).
  triggerKeys?: number[];
  // Keys to be used to dismiss keyboard navigation mode using keyboard (in addition to
  // mouse clicks which dismiss it). For example, Esc could be used to dismiss.
  dismissKeys?: number[];
}

export type KeyborgCallback = (isNavigatingWithKeyboard: boolean) => void;

/**
 * Manages a collection of Keyborg instances in a window/document and updates keyborg state
 */
class KeyborgCore implements Disposable {
  readonly id: string;

  private _win?: WindowWithKeyborg;
  private _isMouseOrTouchUsedTimer: number | undefined;
  private _dismissTimer: number | undefined;
  private _triggerKeys?: Set<number>;
  private _dismissKeys?: Set<number>;
  private _isNavigatingWithKeyboard_DO_NOT_USE = false;

  constructor(win: WindowWithKeyborg, props?: KeyborgProps) {
    this.id = "c" + getNextId(win);
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

    doc.addEventListener("touchstart", this._onMouseOrTouch, true); // Capture!
    doc.addEventListener("touchend", this._onMouseOrTouch, true); // Capture!
    doc.addEventListener("touchcancel", this._onMouseOrTouch, true); // Capture!

    setupFocusEvent(win);
  }

  get isNavigatingWithKeyboard() {
    return this._isNavigatingWithKeyboard_DO_NOT_USE;
  }

  set isNavigatingWithKeyboard(val: boolean) {
    if (this._isNavigatingWithKeyboard_DO_NOT_USE !== val) {
      this._isNavigatingWithKeyboard_DO_NOT_USE = val;
      this.update();
    }
  }

  dispose(): void {
    const win = this._win;

    if (win) {
      if (this._isMouseOrTouchUsedTimer) {
        win.clearTimeout(this._isMouseOrTouchUsedTimer);
        this._isMouseOrTouchUsedTimer = undefined;
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

      doc.removeEventListener("touchstart", this._onMouseOrTouch, true); // Capture!
      doc.removeEventListener("touchend", this._onMouseOrTouch, true); // Capture!
      doc.removeEventListener("touchcancel", this._onMouseOrTouch, true); // Capture!

      delete this._win;
    }
  }

  isDisposed(): boolean {
    return !!this._win;
  }

  /**
   * Updates all keyborg instances with the keyboard navigation state
   */
  update(): void {
    const keyborgs = this._win?.__keyborg?.refs;

    if (keyborgs) {
      for (const id of Object.keys(keyborgs)) {
        Keyborg.update(keyborgs[id], this.isNavigatingWithKeyboard);
      }
    }
  }

  private _onFocusIn = (e: KeyborgFocusInEvent) => {
    // When the focus is moved not programmatically and without keydown events,
    // it is likely that the focus is moved by screen reader (as it might swallow
    // the events when the screen reader shortcuts are used). The screen reader
    // usage is keyboard navigation.

    if (this._isMouseOrTouchUsedTimer) {
      // There was a mouse or touch event recently.
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

    this._onMouseOrTouch();
  };

  private _onMouseOrTouch = (): void => {
    const win = this._win;

    if (win) {
      if (this._isMouseOrTouchUsedTimer) {
        win.clearTimeout(this._isMouseOrTouchUsedTimer);
      }

      this._isMouseOrTouchUsedTimer = win.setTimeout(() => {
        delete this._isMouseOrTouchUsedTimer;
      }, 1000); // Keeping the indication of mouse or touch usage for some time.
    }

    this.isNavigatingWithKeyboard = false;
  };

  private _onKeyDown = (e: KeyboardEvent): void => {
    const isNavigatingWithKeyboard = this.isNavigatingWithKeyboard;

    if (isNavigatingWithKeyboard) {
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
      }, _dismissTimeout);
    }
  }
}

/**
 * Used to determine the keyboard navigation state
 */
export class Keyborg {
  private _id: string;
  private _win?: WindowWithKeyborg;
  private _core?: KeyborgCore;
  private _cb: KeyborgCallback[] = [];

  static create(win: WindowWithKeyborg, props?: KeyborgProps): Keyborg {
    return new Keyborg(win, props);
  }

  static dispose(instance: Keyborg): void {
    instance.dispose();
  }

  /**
   * Updates all subscribed callbacks with the keyboard navigation state
   */
  static update(instance: Keyborg, isNavigatingWithKeyboard: boolean): void {
    instance._cb.forEach((callback) => callback(isNavigatingWithKeyboard));
  }

  private constructor(win: WindowWithKeyborg, props?: KeyborgProps) {
    this._id = "k" + getNextId(win);
    this._win = win;

    const current = win.__keyborg;

    if (current && current.core) {
      // Existing core found
      this._core = current.core;
      current.refs[this._id] = this;
    } else {
      // No existing core, create new one
      this._core = new KeyborgCore(win, props);
      // Preserve the _lastId that was set by getNextId
      const currentLastId = win.__keyborg?._lastId || 0;
      win.__keyborg = {
        core: this._core,
        refs: { [this._id]: this },
        _lastId: currentLastId,
      };
    }
  }

  private dispose(): void {
    const current = this._win?.__keyborg;

    if (current?.refs[this._id]) {
      delete current.refs[this._id];

      if (Object.keys(current.refs).length === 0) {
        current.core.dispose();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        delete this._win!.__keyborg;
      }
    } else if (process.env.NODE_ENV !== "production") {
      console.error(
        `Keyborg instance ${this._id} is being disposed incorrectly.`,
      );
    }

    this._cb = [];
    delete this._core;
    delete this._win;
  }

  /**
   * @returns Whether the user is navigating with keyboard
   */
  isNavigatingWithKeyboard(): boolean {
    return !!this._core?.isNavigatingWithKeyboard;
  }

  /**
   * @param callback - Called when the keyboard navigation state changes
   */
  subscribe(callback: KeyborgCallback): void {
    this._cb.push(callback);
  }

  /**
   * @param callback - Registered with subscribe
   */
  unsubscribe(callback: KeyborgCallback): void {
    const index = this._cb.indexOf(callback);

    if (index >= 0) {
      this._cb.splice(index, 1);
    }
  }

  /**
   * Manually set the keyboard navigtion state
   */
  setVal(isNavigatingWithKeyboard: boolean): void {
    if (this._core) {
      this._core.isNavigatingWithKeyboard = isNavigatingWithKeyboard;
    }
  }
}

export function createKeyborg(win: Window, props?: KeyborgProps): Keyborg {
  return Keyborg.create(win, props);
}

export function disposeKeyborg(instance: Keyborg) {
  Keyborg.dispose(instance);
}
