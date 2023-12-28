export function createEventTarget(win: Window) {
  if (typeof EventTarget === "undefined") {
    return win.document.createElement("div");
  }

  return new EventTarget();
}
