import * as React from "react";
import root from "react-shadow";

import { KeyboardMode } from "./common/KeyboardMode";

export const Default = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div
      style={{ border: "2px solid blue", display: "flex", gap: 5, padding: 20 }}
    >
      <button>Light DOM: Button A</button>
      <button>Light DOM: Button B</button>
    </div>

    <root.div
      data-testid="shadow-root"
      style={{
        border: "2px solid magenta",
        display: "flex",
        gap: 5,
        padding: 20,
      }}
    >
      <button>Shadow DOM: Button A</button>
      <button>Shadow DOM: Button B</button>
    </root.div>

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

    <root.div
      data-testid="shadow-root"
      style={{
        border: "2px solid magenta",
        display: "flex",
        gap: 5,
        padding: 20,
      }}
    >
      <button>Shadow DOM: Button A</button>
      <button>Shadow DOM: Button B</button>

      <root.div
        data-testid="nested-shadow-root"
        style={{
          border: "2px solid magenta",
          display: "flex",
          gap: 5,
          padding: 20,
        }}
      >
        <button>Shadow DOM: Button C</button>
        <button>Shadow DOM: Button D</button>
      </root.div>
    </root.div>

    <KeyboardMode />
  </div>
);
