/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { Keyborg, KeyborgCallback } from "./Keyborg.mts";

export interface KeyborgCoreHandle {
  isNavigatingWithKeyboard: boolean;
  dispose(): void;
}

type LegacyCore = Partial<KeyborgCoreHandle> & {
  getNavigating?: () => boolean;
  setNavigating?: (val: boolean) => void;
};

type KeyborgReference = Partial<Keyborg> & {
  _cb?: KeyborgCallback[];
  _notify?: KeyborgCallback;
  dispose?: () => void;
  _dispose?: () => void;
};

export interface KeyborgSlot {
  core: KeyborgCoreHandle;
  refs: Record<string, KeyborgReference>;
}

type LegacySlot = {
  core: LegacyCore;
  refs: Record<string, KeyborgReference>;
};

type CoreFactory = (
  win: Window,
  isNavigatingWithKeyboard: boolean,
) => KeyborgCoreHandle;

interface CompatibilityRegistry {
  use(version: string, factory: CoreFactory): KeyborgSlot;
}

export interface WindowWithKeyborg extends Window {
  __keyborg?: KeyborgSlot;
  // This survives deletion of __keyborg so later legacy constructors still
  // get the newest registered implementation.
  __keyborgCompat?: CompatibilityRegistry;
}

function compareVersions(left: string, right: string): number {
  const parse = (version: string) => {
    const [main, ...suffix] = version.split("+")[0].split("-");
    return {
      numbers: main.split(".").map((part) => Number(part) || 0),
      pre: suffix.length ? suffix.join("-").split(".") : [],
    };
  };
  const a = parse(left);
  const b = parse(right);
  for (let i = 0; i < 3; i++) {
    const difference = (a.numbers[i] || 0) - (b.numbers[i] || 0);
    if (difference) {
      return difference;
    }
  }
  if (!a.pre.length || !b.pre.length) {
    return b.pre.length - a.pre.length;
  }
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i];
    const y = b.pre[i];
    if (x === y) {
      continue;
    }
    if (x === undefined || y === undefined) {
      return x === undefined ? -1 : 1;
    }
    const xNumeric = /^\d+$/.test(x);
    const yNumeric = /^\d+$/.test(y);
    if (xNumeric && yNumeric) {
      return Number(x) - Number(y);
    }
    if (xNumeric !== yNumeric) {
      return xNumeric ? -1 : 1;
    }
    return x < y ? -1 : 1;
  }
  return 0;
}

function createRegistry(win: WindowWithKeyborg): CompatibilityRegistry {
  let version: string | undefined;
  let factory: CoreFactory;
  let runtime: KeyborgCoreHandle | undefined;
  let slot: KeyborgSlot | undefined;
  let nextId = 0;

  const core = {
    get isNavigatingWithKeyboard() {
      return !!runtime?.isNavigatingWithKeyboard;
    },
    set isNavigatingWithKeyboard(val: boolean) {
      if (runtime) {
        runtime.isNavigatingWithKeyboard = val;
      }
    },
    getNavigating() {
      return core.isNavigatingWithKeyboard;
    },
    setNavigating(val: boolean) {
      core.isNavigatingWithKeyboard = val;
    },
    dispose() {
      const current = runtime;
      runtime = undefined;
      slot = undefined;
      current?.dispose();
    },
  };

  const bridgeCore = (previous: LegacyCore) => {
    if (previous === core || previous === runtime) {
      return;
    }
    Object.defineProperties(previous, {
      isNavigatingWithKeyboard: {
        configurable: true,
        get: () => core.isNavigatingWithKeyboard,
        set: (val: boolean) => {
          core.isNavigatingWithKeyboard = val;
        },
      },
      getNavigating: { configurable: true, value: core.getNavigating },
      setNavigating: { configurable: true, value: core.setNavigating },
      dispose: { configurable: true, value: core.dispose },
    });
  };

  const makeRefs = (): KeyborgSlot["refs"] => {
    const entries: KeyborgSlot["refs"] = Object.create(null);
    type Registration = {
      originalId: string;
      storageId: string;
      live: boolean;
    };
    const registrations = new Map<string, Registration>();
    const instances = new WeakMap<KeyborgReference, Registration>();
    // Legacy disposers retain their original IDs. Remap their registry
    // accesses only while that instance is disposing.
    const disposing: Registration[] = [];
    const resolve = (id: string): string => {
      const current = disposing[disposing.length - 1];
      return current?.originalId === id ? current.storageId : id;
    };

    const refs: KeyborgSlot["refs"] = new Proxy(entries, {
      get(target, id: string | symbol) {
        if (typeof id !== "string") {
          return Reflect.get(target, id);
        }
        const current = disposing[disposing.length - 1];
        if (current?.originalId === id && !current.live) {
          return undefined;
        }
        return target[resolve(id)];
      },
      deleteProperty(target, id: string | symbol) {
        if (typeof id !== "string") {
          return Reflect.deleteProperty(target, id);
        }
        const current = disposing[disposing.length - 1];
        if (current?.originalId === id && !current.live) {
          return true;
        }
        const storageId = resolve(id);
        const registration = registrations.get(storageId);
        if (registration) {
          registration.live = false;
          registrations.delete(storageId);
        }
        return Reflect.deleteProperty(target, storageId);
      },
      set(target, id: string | symbol, instance: KeyborgReference) {
        if (typeof id !== "string") {
          return Reflect.set(target, id, instance);
        }
        if (instances.get(instance)?.live) {
          return true;
        }
        let storageId = id;
        while (target[storageId]) {
          storageId = "kc-" + ++nextId;
        }
        const registration = { originalId: id, storageId, live: true };
        registrations.set(storageId, registration);
        instances.set(instance, registration);
        target[storageId] = instance;

        const notify = instance._notify;
        if (!instance._cb) {
          instance._cb = notify ? [(val) => notify.call(instance, val)] : [];
        }
        if (!notify) {
          instance._notify = (val) => {
            instance._cb?.forEach((callback) => callback(val));
          };
        }
        // V1 reads/writes a module-local singleton, not its cached core.
        // Forward the public methods too, while retaining the same object.
        instance.isNavigatingWithKeyboard = () =>
          registration.live && core.isNavigatingWithKeyboard;
        instance.setVal = (val) => {
          if (registration.live) {
            core.isNavigatingWithKeyboard = val;
          }
        };

        const originalDispose = instance.dispose || instance._dispose;
        const dispose = () => {
          disposing.push(registration);
          try {
            if (originalDispose) {
              originalDispose.call(instance);
            } else if (registration.live) {
              delete refs[id];
              instance._cb?.splice(0);
              if (!Object.keys(entries).length) {
                core.dispose();
                delete win.__keyborg;
              }
            }
          } finally {
            disposing.pop();
            installAccessor();
          }
        };
        instance.dispose = dispose;
        instance._dispose = dispose;
        return true;
      },
    });
    return refs;
  };

  const adopt = (incoming: LegacySlot) => {
    const previous = runtime || incoming.core;
    const first = Object.values(incoming.refs)[0];
    const initial = runtime
      ? runtime.isNavigatingWithKeyboard
      : (first?.isNavigatingWithKeyboard?.() ??
        incoming.core.getNavigating?.() ??
        !!incoming.core.isNavigatingWithKeyboard);
    if (!slot) {
      slot = { core, refs: makeRefs() };
    }
    for (const [id, instance] of Object.entries(incoming.refs)) {
      slot.refs[id] = instance;
    }
    runtime = undefined;
    previous.dispose?.();
    if (incoming.core !== previous && incoming.core !== core) {
      incoming.core.dispose?.();
    }
    runtime = factory(win, initial);
    bridgeCore(previous);
    bridgeCore(incoming.core);
  };

  const get = () => slot;
  const set = (incoming: LegacySlot | undefined) => {
    if (incoming && incoming !== slot) {
      adopt(incoming);
    } else if (!incoming) {
      core.dispose();
    }
  };
  function installAccessor(): boolean {
    if (Object.getOwnPropertyDescriptor(win, "__keyborg")?.get === get) {
      return false;
    }
    const incoming = win.__keyborg;
    Object.defineProperty(win, "__keyborg", {
      configurable: true,
      enumerable: true,
      get,
      set,
    });
    if (incoming && incoming !== slot) {
      adopt(incoming);
      return true;
    }
    return false;
  }

  return {
    use(nextVersion, nextFactory) {
      const upgrade =
        version === undefined || compareVersions(nextVersion, version) > 0;
      if (upgrade) {
        version = nextVersion;
        factory = nextFactory;
      }
      const adopted = installAccessor();
      if (!slot) {
        slot = { core, refs: makeRefs() };
        runtime = factory(win, false);
      } else if (upgrade && !adopted) {
        const previous = runtime;
        const initial = !!previous?.isNavigatingWithKeyboard;
        runtime = undefined;
        previous?.dispose();
        runtime = factory(win, initial);
        if (previous) {
          bridgeCore(previous);
        }
      }
      return slot;
    },
  };
}

export function getKeyborgSlot(
  win: Window,
  version: string,
  factory: CoreFactory,
): KeyborgSlot {
  const kwin = win as WindowWithKeyborg;
  const registry = (kwin.__keyborgCompat ||= createRegistry(kwin));
  return registry.use(version, factory);
}
