/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import root from "react-shadow";

export const ShadowRoot: React.FC<{
  children: React.ReactNode;
  tabIndex?: number;
}> = ({ children, tabIndex, ...rest }) => {
  return (
    <root.div
      tabIndex={tabIndex}
      {...rest}
      style={{
        border: "2px solid magenta",
        display: "flex",
        gap: 5,
        padding: 20,
      }}
    >
      {children}
    </root.div>
  );
};
