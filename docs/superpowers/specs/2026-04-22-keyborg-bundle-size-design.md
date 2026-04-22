# Keyborg Bundle-Size Reduction

Date: 2026-04-22
Status: Approved

## Goals & Non-Goals

**Goal.** Reduce `dist/index.js` minified and gzipped size, measured by `npm run bundle-size` (monosize + webpack fixtures in `bundle-size/`), without changing the public API.

**Public API (must not change).** `createKeyborg`, `disposeKeyborg`, `Keyborg` (type), `KeyborgCallback`, `getLastFocusedProgrammatically`, `nativeFocus`, `KEYBORG_FOCUSIN`, `KEYBORG_FOCUSOUT`, `version`.

**Non-goals.** Behavior changes, API redesign, dropping Shadow DOM support, raising the browserslist floor beyond the current `defaults, not IE 11`, changing the TS 3.9 `downlevel-dts` output path.

**Constraints.**
- Playwright tests in `tests/` stay green.
- All three bundle-size fixtures (`all-exports`, `create-n-dispose`, `focus-in-const`) keep compiling and must shrink or stay within ±0.5% noise.
- Build target stays **ES2019** for PR 1 and PR 2. PR 3 and PR 4 are measurement spikes; raise target or swap emitter only if the measurement justifies it.

## Approach

Four stacked PRs, low-risk first. Each PR is independently revertable and ships only if its measurement justifies it (for PRs 3 and 4).

### PR 1 — Drop `WeakRefInstance` IE11 shim

Mechanical replacement of the shim with native `WeakRef`. `.browserslistrc` already excludes IE 11, so the shim serves no supported target.

Changes:
- Delete `src/WeakRefInstance.mts`.
- In `src/FocusEvent.mts`, replace both `new WeakRefInstance(...)` call sites with `new WeakRef(...)` and update the two type references in `KeyborgFocusEventData` (`WeakRefInstance<HTMLElement>` → `WeakRef<HTMLElement>`, `Set<WeakRefInstance<ShadowRoot>>` → `Set<WeakRef<ShadowRoot>>`).
- In `src/Keyborg.mts`, remove `import { Disposable }`, remove `implements Disposable`, and delete the unused `isDisposed()` method on `KeyborgCore` (the method is only called via the shim's fallback path, and its body `return !!this._win` is inverted — it returns `true` before dispose — which confirms it is unreachable in supported browsers).

Expected win: small (~200–400 bytes minified), essentially free.

### PR 2 — Refactor classes to closure-based factories

Classes in `src/Keyborg.mts` do not minify well at `target: "es2019"`: class fields get transpiled to constructor assignments (`this._triggerKeys = …`) whose property names the minifier cannot mangle. Converting the two classes to factory functions moves per-instance state into closure variables, which minify to single-letter names.

Changes:
- `class KeyborgCore` → `createKeyborgCore(win, props)` returning an internal handle `{ dispose(): void; setNavigating(v: boolean): void; getNavigating(): boolean }`. The getter/setter pair for `isNavigatingWithKeyboard` collapses into explicit `get`/`set` functions on the handle.
- `class Keyborg` → factory `createKeyborg(win, props)` returning an object with methods `isNavigatingWithKeyboard`, `subscribe`, `unsubscribe`, `setVal`. The static `Keyborg.create` / `Keyborg.dispose` / `Keyborg.update` pattern collapses into module-scope helpers.
- `Keyborg` remains as an exported **type** (matching `index.mts`' current `export type { Keyborg }`). No runtime class was ever exported, so this is invisible to consumers.
- `WindowWithKeyborg.__keyborg`'s outer shape (`{ core, refs }`) is preserved. The `core` field's internal method surface changes, but `core` is not part of the documented API.
- Public method names (`isNavigatingWithKeyboard`, `subscribe`, `unsubscribe`, `setVal`, `dispose`) stay byte-identical because they are on the external interface.

Expected win: the largest of the four PRs.

### PR 3 — Measurement spike: raise `target` to ES2022

Temporary branch flips `target: "es2019"` → `"es2022"` in `tsdown.config.mts`. At ES2022, `#private` fields and class fields are native, optional chaining and nullish coalescing are not transpiled, and several other features that today emit helpers become direct syntax.

Decision rule: ship the target bump if total minified shrinks ≥2% **and** gzipped does not regress on any fixture. Otherwise close the PR with the measured numbers recorded.

Risk to flag in the PR description: raising the target does not affect `downlevel-dts`, which only rewrites emitted `.d.ts` files.

### PR 4 — Measurement spike: plain `tsc` as emitter

Independent from PR 3. Swap `tsdown` for plain `tsc` as the build emitter, keep `downlevel-dts` unchanged.

Changes required if the spike proceeds:
- Replace `env: { PKG_VERSION: pkg.version }` inlining (tsdown-only) with a generated `src/version.ts` written from `package.json` at build time, re-exported from `src/index.mts`.
- Update `npm run build` to `tsc && npx downlevel-dts ./dist ./dist/ts3.9` (or equivalent two-pass for `cjs` + `esm`).

Decision rule: same as PR 3 — ship if total minified shrinks ≥2% and gzipped does not regress; otherwise close with a note.

Risk to flag: tsc emits per-file, not bundled — the published shape becomes multi-file instead of one-file `dist/index.js`. Downstream bundlers tree-shake ESM fine, but any consumer doing `require("keyborg/dist/index.cjs")` at a pinned path would break. `package.json` `exports` currently only expose `.` and `./package.json`, so this is low risk but must be verified before merging.

## Measurement Workflow

Per-PR ritual:

1. Branch off the previous PR's tip (or `main` for PR 1).
2. Run `npm run build && npm run bundle-size` before making changes — captures "before" numbers.
3. Make the changes.
4. Re-run `npm run bundle-size`.
5. Paste a before/after table into the PR description covering all three fixtures (minified + gzipped). Headline numbers are `all-exports` and `create-n-dispose`; `focus-in-const` is a noise check.
6. If any fixture grows, stop and investigate before pushing — do not paper over regressions.

CI. `bundle-size.yml` posts comparisons to PRs via `monosize-storage-git` against the base branch. Stacked PRs target the **previous PR's branch** as their base so the comparison is meaningful, then retarget to `main` after the parent merges. Call this out in each PR description.

"Done" for each PR:
- Playwright tests green (`npm test`).
- `npm run lint` and `npm run format` clean.
- Bundle size shrinks or stays within ±0.5% noise for the trivial `focus-in-const` fixture.

## Risks

**R1 — PR 2 behavioral drift.** The class-to-closure refactor touches every line of `Keyborg.mts`. Mitigation: keep method signatures, call order, and externally-visible identifiers byte-identical. Only internal state names move from `this._x` to closure locals.

**R2 — Private closure state vs. debugging.** Closure-based factories produce flatter stack traces than classes. Mitigation: name the factory functions (`createKeyborg`, `createKeyborgCore`) so stack frames stay readable; avoid anonymous handlers.

**R3 — `__keyborg` global shape is an undocumented contract.** `WindowWithKeyborg.__keyborg` is attached to `window`. External tools (Tabster is referenced in `FocusEvent.mts` line 248) may rely on the shape. Mitigation: PR 2 preserves the outer `{ core, refs }` shape. The internal `core` surface changes; if a consumer reads `core.isNavigatingWithKeyboard`, that is an undocumented leak — flag it in the PR for the maintainer to confirm.

**R4 — PR 3 target bump affecting emitted helpers for unused features.** Unlikely given the surface (no async generators, no decorators). The measurement spike itself covers this.

## Rollout

Branch naming (each stacked off the prior):

- `perf/drop-weakref-shim` → PR 1 (base: `main`)
- `perf/closure-refactor` → PR 2 (base: `perf/drop-weakref-shim`)
- `perf/es2022-spike` → PR 3 (base: `perf/closure-refactor`)
- `perf/tsc-emit-spike` → PR 4 (base: `main` after PR 2 merges; independent of PR 3)

PR 3 and PR 4 are independent measurements against the post-PR-2 baseline and can merge in either order, both, or neither.

Merge order: PR 1 → retarget PR 2 base to `main` → merge PR 2 → open PR 3 and PR 4 off updated `main` → merge or close each based on its measurement.

Rollback: each PR is a single logical change, `git revert <merge-sha>`. PR 2 carries the highest revert risk; the Playwright suite is the tripwire.

## Out of Scope

- Raising the browserslist floor.
- Switching to a different bundler beyond the `tsc` spike in PR 4.
- Changing the TS 3.9 `downlevel-dts` typings path.
- Any API additions or removals.
