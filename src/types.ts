export interface KeyboardNavigationEventData {
  isNavigatingWithKeyboard: boolean;
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
 * Allows disposable instances to be used
 */
export interface Disposable {
  isDisposed?(): boolean;
}
