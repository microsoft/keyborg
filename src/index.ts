/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export type { Keyborg, KeyborgCallback } from "./Keyborg";
export { createKeyborg, disposeKeyborg } from "./Keyborg";

export type {
  KeyborgFocusInEvent,
  KeyborgFocusInEventDetails,
} from "./FocusEvent";
export {
  getLastFocusedProgrammatically,
  nativeFocus,
  KEYBORG_FOCUSIN,
} from "./FocusEvent";

export const version = process.env.PKG_VERSION;
