/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { createKeyborg } from "../../src";

export function KeyboardMode() {
  const [isNavigatingWithKeyboard, setIsNavigatingWithKeyboard] =
    React.useState(false);
  const keyborg = createKeyborg(window);

  React.useEffect(() => {
    setIsNavigatingWithKeyboard(keyborg.isNavigatingWithKeyboard());
    keyborg.subscribe(setIsNavigatingWithKeyboard);

    return () => keyborg.unsubscribe(setIsNavigatingWithKeyboard);
  }, [keyborg]);

  return (
    <div style={{ border: "2px solid grey", padding: 5 }}>
      Is navigating with keyboard:{" "}
      <code data-testid="keyboard-mode">
        {isNavigatingWithKeyboard.toString()}
      </code>
    </div>
  );
}

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

export { createKeyborg };
