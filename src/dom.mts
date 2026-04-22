/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// All keyborg listeners use the capture phase; centralizing the calls lets the
// minifier collapse repeated DOM method names.
export const on = (
  target: EventTarget,
  type: string,
  handler: EventListener,
): void => {
  target.addEventListener(type, handler, true);
};

export const off = (
  target: EventTarget,
  type: string,
  handler: EventListener,
): void => {
  target.removeEventListener(type, handler, true);
};
