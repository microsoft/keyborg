/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { KeyboardMode } from "./common/KeyboardMode";

export const Buttons = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <h1>Focus Behavior with Buttons</h1>

    <div
      style={{ border: "2px solid blue", display: "flex", gap: 5, padding: 20 }}
    >
      <button>Button A</button>
      <button>Button B</button>
      <button>Button C</button>
    </div>

    <KeyboardMode />
  </div>
);

export const Input = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <h1>Focus Behavior with Buttons</h1>

    <div
      style={{ border: "2px solid blue", display: "flex", gap: 5, padding: 20 }}
    >
      <input type="text" />
      <button>After</button>
    </div>

    <KeyboardMode />
  </div>
);
