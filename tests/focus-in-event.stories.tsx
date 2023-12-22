import * as React from "react";
import root from "react-shadow";

import { createKeyborg, disposeKeyborg, KEYBORG_FOCUSIN } from "../src";
import type { KeyborgFocusInEvent } from "../src";

function FocusInListener(props: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const scopeElementRef = React.useRef<HTMLDivElement | null>(null);
  const focusedElementRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const keyborg = createKeyborg(window);

    function disposeCurrentElement() {
      if (focusedElementRef.current) {
        focusedElementRef.current.style.outline = "";
        focusedElementRef.current.classList.remove("focus-visible");

        focusedElementRef.current = null;
      }
    }

    const keyborgListener = (e: KeyborgFocusInEvent) => {
      disposeCurrentElement();

      if (keyborg.isNavigatingWithKeyboard()) {
        focusedElementRef.current = e.target as HTMLElement;

        focusedElementRef.current.style.outline = "4px solid orange";
        focusedElementRef.current.classList.add("focus-visible");
      }
    };

    const blurListener = (e: FocusEvent) => {
      if (
        !e.relatedTarget ||
        !scopeElementRef.current?.contains(e.relatedTarget as HTMLElement)
      ) {
        disposeCurrentElement();
      }
    };

    keyborg.subscribe((isNavigatingWithKeyboard) => {
      if (!isNavigatingWithKeyboard) {
        disposeCurrentElement();
      }
    });

    scopeElementRef.current?.addEventListener(KEYBORG_FOCUSIN, keyborgListener);
    scopeElementRef.current?.addEventListener("focusout", blurListener);

    return () => {
      disposeCurrentElement();

      scopeElementRef.current?.removeEventListener(
        KEYBORG_FOCUSIN,
        keyborgListener
      );
      scopeElementRef.current?.removeEventListener("focusout", blurListener);

      disposeKeyborg(keyborg);
    };
  }, []);

  return (
    <div ref={scopeElementRef} style={props.style}>
      {props.children}
    </div>
  );
}

export const Default = () => (
  <FocusInListener>
    <div
      style={{ border: "2px solid blue", display: "flex", gap: 5, padding: 20 }}
    >
      <button>Button A</button>
      <button>Button B</button>
      <button>Button C</button>
    </div>
  </FocusInListener>
);

export const NestedShadowRoots = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <FocusInListener>
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
    </FocusInListener>

    <root.div
      data-testid="shadow-root"
      style={{
        border: "2px solid magenta",
        display: "flex",
        gap: 5,
        padding: 20,
      }}
    >
      <FocusInListener
        style={{
          display: "flex",
          gap: 5,
          padding: 20,
        }}
      >
        <button>Shadow DOM: Button A</button>
        <button>Shadow DOM: Button B</button>
      </FocusInListener>

      <root.div data-testid="nested-shadow-root">
        <FocusInListener
          style={{
            border: "2px solid magenta",
            display: "flex",
            gap: 5,
            padding: 20,
          }}
        >
          <button>Shadow DOM: Button C</button>
          <button>Shadow DOM: Button D</button>
        </FocusInListener>
      </root.div>
    </root.div>
  </div>
);
