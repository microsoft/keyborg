/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { createKeyborg, disposeKeyborg } from "../src/index.mts";
import type { Keyborg } from "../src/index.mts";

const meta = { title: "Multi Instance" };
export default meta;

function KeyboardModeInstance({ label }: { label: string }) {
  const [isNavigatingWithKeyboard, setIsNavigatingWithKeyboard] =
    React.useState(false);
  const keyborgRef = React.useRef<Keyborg | null>(null);

  React.useEffect(() => {
    const keyborg = createKeyborg(window);
    keyborgRef.current = keyborg;

    setIsNavigatingWithKeyboard(keyborg.isNavigatingWithKeyboard());
    keyborg.subscribe(setIsNavigatingWithKeyboard);

    return () => {
      keyborg.unsubscribe(setIsNavigatingWithKeyboard);
      disposeKeyborg(keyborg);
    };
  }, []);

  return (
    <div style={{ border: "2px solid grey", padding: 5 }}>
      {label} navigating with keyboard:{" "}
      <code data-testid={`keyboard-mode-${label}`}>
        {isNavigatingWithKeyboard.toString()}
      </code>
    </div>
  );
}

export const TwoInstances = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <h1>Multi-Instance Keyborg</h1>

    <div
      style={{ border: "2px solid blue", display: "flex", gap: 5, padding: 20 }}
    >
      <button>Button A</button>
      <button>Button B</button>
    </div>

    <KeyboardModeInstance label="instance-1" />
    <KeyboardModeInstance label="instance-2" />
  </div>
);
