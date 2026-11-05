/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export type { Keyborg, KeyborgCallback } from "./Keyborg.mts";
export { createKeyborg, disposeKeyborg, version } from "./Keyborg.mts";

export type {
  KeyborgFocusInEvent,
  KeyborgFocusInEventDetails,
  KeyborgFocusOutEvent,
  KeyborgFocusOutEventDetails,
} from "./FocusEvent.mts";
export {
  getLastFocusedProgrammatically,
  nativeFocus,
  KEYBORG_FOCUSIN,
  KEYBORG_FOCUSOUT,
} from "./FocusEvent.mts";
