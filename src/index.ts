/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export {
  Keyborg,
  KeyborgCallback,
  createKeyborg,
  disposeKeyborg,
} from "./Keyborg";

export {
  getLastFocusedProgrammatically,
  nativeFocus,
  KEYBORG_FOCUSIN,
  KeyborgFocusInEvent,
  KeyborgFocusInEventDetails,
} from "./FocusEvent";

export const version = process.env.PKG_VERSION;
