/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Also drills into open shadow roots
 * @returns The active element of a document
 */
export function getActiveElement(win: Window | undefined): HTMLElement | null {
  const activeElement = win?.document.activeElement as HTMLElement | null;

  if (!activeElement?.shadowRoot) {
    return activeElement;
  }

  return activeElement.shadowRoot.activeElement as HTMLElement | null;
}
