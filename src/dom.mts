/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// All keyborg listeners use the capture phase; centralizing the calls lets the
// minifier collapse the repeated DOM method names into a single short-named
// import binding.
export const addEventListener = (
  target: EventTarget,
  type: string,
  handler: EventListener,
): void => {
  target.addEventListener(type, handler, true);
};

export const removeEventListener = (
  target: EventTarget,
  type: string,
  handler: EventListener,
): void => {
  target.removeEventListener(type, handler, true);
};
