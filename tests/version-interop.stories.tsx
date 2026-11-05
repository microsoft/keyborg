/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import * as legacy from "keyborg-legacy";
import * as notify from "keyborg-notify";
import * as v1 from "keyborg-v1";
import * as v2 from "keyborg-v2";
import * as v3 from "keyborg-v3";

import { getKeyborgSlot } from "../src/Compatibility.mts";
import * as current from "../src/index.mts";

export type LegacyVersion = "v1" | "v2" | "notify" | "legacy" | "v3";

export interface WindowWithKeyborgModules extends Window {
  keyborgModules: Record<
    LegacyVersion | "current",
    {
      createKeyborg: typeof current.createKeyborg;
      disposeKeyborg(instance: current.Keyborg): void;
      nativeFocus: typeof current.nativeFocus;
      getLastFocusedProgrammatically: typeof current.getLastFocusedProgrammatically;
    }
  >;
  getKeyborgSlot: typeof getKeyborgSlot;
  LegacyKeyborg: typeof v1.Keyborg;
  __keyborg?: ReturnType<typeof getKeyborgSlot>;
}

export default { title: "Version Interop" };

export const Default = () => {
  const win = window as unknown as WindowWithKeyborgModules;
  win.keyborgModules = { current, v1, v2, notify, legacy, v3 };
  win.getKeyborgSlot = getKeyborgSlot;
  win.LegacyKeyborg = v1.Keyborg;
  return <div data-testid="fixture">version interop fixture</div>;
};
