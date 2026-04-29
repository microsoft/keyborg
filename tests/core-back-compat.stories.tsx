/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";

import { createKeyborg, disposeKeyborg } from "../src/index.mts";

interface WindowWithKeyborgFactory extends Window {
  createKeyborg?: typeof createKeyborg;
  disposeKeyborg?: typeof disposeKeyborg;
}

const meta = { title: "Core Back Compat" };
export default meta;

// Empty fixture: exposes the factories on `window` so the spec can install a
// foreign-shaped `__keyborg.core` before keyborg is initialized.
export const Default = () => {
  (window as WindowWithKeyborgFactory).createKeyborg = createKeyborg;
  (window as WindowWithKeyborgFactory).disposeKeyborg = disposeKeyborg;
  return <div data-testid="fixture">core back compat fixture</div>;
};
