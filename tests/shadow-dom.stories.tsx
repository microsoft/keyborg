/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";

import { KeyboardMode, createKeyborg } from "./common/KeyboardMode";
import { ShadowRoot } from "./common/ShadowRoot";

export const Default = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div
      style={{ border: "2px solid blue", display: "flex", gap: 5, padding: 20 }}
    >
      <button>Light DOM: Button A</button>
      <button>Light DOM: Button B</button>
    </div>

    <ShadowRoot data-testid="shadow-root">
      <button>Shadow DOM: Button A</button>
      <button>Shadow DOM: Button B</button>
    </ShadowRoot>

    <KeyboardMode />
  </div>
);

export const Nested = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div
      style={{ border: "2px solid blue", display: "flex", gap: 5, padding: 20 }}
    >
      <button>Light DOM: Button A</button>
    </div>

    <ShadowRoot data-testid="shadow-root">
      <button>Shadow DOM: Button A</button>
      <button>Shadow DOM: Button B</button>

      <ShadowRoot data-testid="nested-shadow-root">
        <button>Shadow DOM: Button C</button>
        <button>Shadow DOM: Button D</button>
      </ShadowRoot>
    </ShadowRoot>

    <KeyboardMode />
  </div>
);

interface WindowWithCreateKeyborg extends Window {
  createKeyborg?: typeof createKeyborg;
}

export const Lazy = () => {
  (window as WindowWithCreateKeyborg).createKeyborg = createKeyborg;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
      data-testid="root"
    >
      <div
        style={{
          border: "2px solid blue",
          display: "flex",
          gap: 5,
          padding: 20,
        }}
      >
        <button>Light DOM: Button A</button>
      </div>

      <ShadowRoot data-testid="shadow-root">
        <button>Shadow DOM: Button A</button>
        <button>Shadow DOM: Button B</button>

        <ShadowRoot data-testid="nested-shadow-root">
          <button>Shadow DOM: Button C</button>
          <button>Shadow DOM: Button D</button>
        </ShadowRoot>

        <button>Shadow DOM: Button E</button>
      </ShadowRoot>

      <button>Light DOM: Button B</button>
    </div>
  );
};

export const ParallelNested = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div
      style={{
        border: "2px solid blue",
        display: "flex",
        gap: 5,
        padding: 20,
      }}
    >
      <button>Light DOM: Button A</button>
    </div>

    <ShadowRoot data-testid="shadow-root-level-1">
      <ShadowRoot data-testid="shadow-root-level-2">
        <ShadowRoot data-testid="shadow-root-level-3a">
          <button>Shadow DOM: Button A</button>
        </ShadowRoot>

        <ShadowRoot data-testid="shadow-root-level-3b">
          <button>Shadow DOM: Button B</button>
        </ShadowRoot>
      </ShadowRoot>
    </ShadowRoot>

    <KeyboardMode />
  </div>
);
