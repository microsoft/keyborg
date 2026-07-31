/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import type { Decorator, Preview } from "@storybook/react-vite";

// Capture the original focus method before Storybook's test addon may patch it.
const originalFocus = HTMLElement.prototype.focus;

// Storybook 10.5+ adds a `enhanceContext` loader that installs an accessor
// getter on HTMLElement.prototype.focus (for its component-testing / user-event
// integration). That getter calls `this.ownerDocument`, which throws
// "Illegal invocation" when `this` is HTMLElement.prototype itself – exactly
// the access pattern used by keyborg's setupFocusEvent to retrieve the native
// focus method.
//
// Global decorators run after all loaders have resolved, so this is a safe
// place to restore focus to a plain value property before each story renders.
const keyborgCompatDecorator: Decorator = (Story) => {
  if (Object.getOwnPropertyDescriptor(HTMLElement.prototype, "focus")?.get) {
    Object.defineProperty(HTMLElement.prototype, "focus", {
      configurable: true,
      writable: true,
      value: originalFocus,
    });
  }
  return <Story />;
};

const preview: Preview = {
  decorators: [keyborgCompatDecorator],
};

export default preview;
