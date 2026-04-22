# PR 1 — Drop `WeakRefInstance` IE11 Shim

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the internal `WeakRefInstance` IE11 shim with native `WeakRef` throughout `src/`, deleting the shim file. Public API unchanged; Playwright tests must stay green.

**Architecture:** Mechanical rename. `WeakRefInstance<T>` → `WeakRef<T>`, `new WeakRefInstance(x)` → `new WeakRef(x)`. Drop the companion `Disposable` interface and the unused (and inverted) `KeyborgCore.isDisposed()` method, which exist only to support the shim's fallback path. `.browserslistrc` already excludes IE 11, so this path is unreachable.

**Tech Stack:** TypeScript, tsdown (build), Playwright (tests), monosize (bundle-size measurement).

**Design reference:** `docs/superpowers/specs/2026-04-22-keyborg-bundle-size-design.md` (§PR 1).

**TDD note:** This is a behavior-preserving refactor. No new test is added; the existing Playwright suite is the regression tripwire. The discipline is "run tests before and after; they must stay green."

---

### Task 1: Create branch and capture baseline measurement

**Files:** none

- [ ] **Step 1: Create feature branch from `main`**

```bash
git checkout main
git pull
git checkout -b perf/drop-weakref-shim
```

- [ ] **Step 2: Run baseline build + measurement**

```bash
npm run bundle-size
```

Expected: completes successfully and prints a table like:
```
 Fixture                                    Minified size  Gzipped size
 All exports                                  XX.XX kB       X.XX kB
 `createKeyborg()` & `disposeKeyborg()`       X.XX kB        X.XX kB
 `KEYBORG_FOCUSIN` constant                   XX B           XX B
```

- [ ] **Step 3: Record baseline numbers**

Copy the printed table into a local scratch note (plain text file or the PR draft). You will paste a before/after diff of this table into the PR description at the end of Task 5.

---

### Task 2: Migrate `src/FocusEvent.mts` to native `WeakRef`

**Files:**
- Modify: `src/FocusEvent.mts` (5 locations)

- [ ] **Step 1: Remove the `WeakRefInstance` import**

In `src/FocusEvent.mts`, delete line 5:

```typescript
import { WeakRefInstance } from "./WeakRefInstance.mts";
```

- [ ] **Step 2: Update the `KeyborgFocusEventData` interface types**

Still in `src/FocusEvent.mts`, lines 17–22 currently read:

```typescript
interface KeyborgFocusEventData {
  focusInHandler: (e: FocusEvent) => void;
  focusOutHandler: (e: FocusEvent) => void;
  lastFocusedProgrammatically?: WeakRefInstance<HTMLElement>;
  shadowTargets: Set<WeakRefInstance<ShadowRoot>>;
}
```

Replace with:

```typescript
interface KeyborgFocusEventData {
  focusInHandler: (e: FocusEvent) => void;
  focusOutHandler: (e: FocusEvent) => void;
  lastFocusedProgrammatically?: WeakRef<HTMLElement>;
  shadowTargets: Set<WeakRef<ShadowRoot>>;
}
```

- [ ] **Step 3: Update the `shadowTargets` local declaration**

Still in `src/FocusEvent.mts`, around line 104, change:

```typescript
const shadowTargets: Set<WeakRefInstance<ShadowRoot>> = new Set();
```

to:

```typescript
const shadowTargets: Set<WeakRef<ShadowRoot>> = new Set();
```

- [ ] **Step 4: Update the `shadowTargets.add(...)` call**

Still in `src/FocusEvent.mts`, around line 230, change:

```typescript
shadowTargets.add(new WeakRefInstance(shadowRoot));
```

to:

```typescript
shadowTargets.add(new WeakRef(shadowRoot));
```

- [ ] **Step 5: Update the `lastFocusedProgrammatically` assignment inside the overridden `focus` function**

Still in `src/FocusEvent.mts`, around lines 283–286, change:

```typescript
if (keyborgNativeFocusEvent) {
  keyborgNativeFocusEvent.lastFocusedProgrammatically = new WeakRefInstance(
    this,
  );
}
```

to:

```typescript
if (keyborgNativeFocusEvent) {
  keyborgNativeFocusEvent.lastFocusedProgrammatically = new WeakRef(this);
}
```

- [ ] **Step 6: Verify no remaining references in this file**

```bash
grep -n "WeakRefInstance" src/FocusEvent.mts
```

Expected: no output (exit code 1). If any match remains, repeat the relevant step.

---

### Task 3: Migrate `src/Keyborg.mts` to drop the `Disposable` interface

**Files:**
- Modify: `src/Keyborg.mts` (3 locations)

- [ ] **Step 1: Remove the `Disposable` import**

In `src/Keyborg.mts`, delete line 12:

```typescript
import { Disposable } from "./WeakRefInstance.mts";
```

- [ ] **Step 2: Remove `implements Disposable` from `KeyborgCore`**

Around line 40, change:

```typescript
class KeyborgCore implements Disposable {
```

to:

```typescript
class KeyborgCore {
```

- [ ] **Step 3: Delete the `isDisposed()` method**

Around lines 120–122, delete the entire method:

```typescript
isDisposed(): boolean {
  return !!this._win;
}
```

Also delete the blank line that follows it if one remains, so the file stays tidy.

- [ ] **Step 4: Verify no remaining references in this file**

```bash
grep -nE "Disposable|isDisposed" src/Keyborg.mts
```

Expected: no output (exit code 1). If any match remains, repeat the relevant step.

---

### Task 4: Delete the shim file

**Files:**
- Delete: `src/WeakRefInstance.mts`

- [ ] **Step 1: Confirm no importers remain**

```bash
grep -rn "WeakRefInstance\|from \"./WeakRefInstance" src/ tests/
```

Expected: no output. If any match appears, return to Task 2 or Task 3 and clean it up before deleting.

- [ ] **Step 2: Delete the file**

```bash
git rm src/WeakRefInstance.mts
```

Expected: `rm 'src/WeakRefInstance.mts'`.

---

### Task 5: Verify, measure, commit, push, open PR

**Files:** none (verification and publication)

- [ ] **Step 1: Lint**

```bash
npm run lint
```

Expected: exits 0 with no errors.

- [ ] **Step 2: Format check**

```bash
npm run format
```

Expected: exits 0. If it reports unformatted files among the ones you touched, run `npm run format:fix` and re-run `npm run format`.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: produces `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/ts3.9/index.d.ts` with no errors.

- [ ] **Step 4: Run Playwright tests**

```bash
npm test
```

Expected: all tests pass. Playwright auto-starts Storybook on port 3000 via `playwright.config.mts`' `webServer` entry. If a prior Storybook instance is already listening on 3000, `reuseExistingServer: true` will reuse it.

- [ ] **Step 5: Re-run bundle-size measurement**

```bash
npm run bundle-size
```

Expected: the printed table should show each fixture's minified size at or below the baseline recorded in Task 1, Step 3. If `all-exports` or `create-n-dispose` grew, stop and investigate before committing.

- [ ] **Step 6: Stage all changes**

```bash
git add src/FocusEvent.mts src/Keyborg.mts
git status
```

Expected: `git status` shows `src/FocusEvent.mts` and `src/Keyborg.mts` as modified, and `src/WeakRefInstance.mts` as deleted.

- [ ] **Step 7: Commit**

```bash
git commit -m "$(cat <<'EOF'
perf: drop WeakRefInstance IE11 shim in favor of native WeakRef

.browserslistrc excludes IE 11, so the shim's fallback path is
unreachable. Replace with native WeakRef, remove the companion
Disposable interface, and delete the unused KeyborgCore.isDisposed()
method (its body return !!this._win was inverted — returned true
before dispose — which confirms nothing on the supported path ever
called it).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds.

- [ ] **Step 8: Push the branch**

```bash
git push -u origin perf/drop-weakref-shim
```

Expected: branch published and tracking set. Note the PR creation URL that `git push` prints.

- [ ] **Step 9: Open the PR**

```bash
gh pr create --title "perf: drop WeakRefInstance IE11 shim" --body "$(cat <<'EOF'
## Summary
- Replaces the internal `WeakRefInstance` shim with native `WeakRef`. `.browserslistrc` already excludes IE 11, so the shim's fallback branch is dead code on every supported target.
- Drops the companion `Disposable` interface and the unused `KeyborgCore.isDisposed()` method (its body was also inverted).
- Public API unchanged. PR 1 of the bundle-size reduction stack — see `docs/superpowers/specs/2026-04-22-keyborg-bundle-size-design.md`.

## Bundle size

| Fixture | Before (min / gz) | After (min / gz) | Delta |
| --- | --- | --- | --- |
| All exports | _paste_ | _paste_ | _paste_ |
| `createKeyborg()` & `disposeKeyborg()` | _paste_ | _paste_ | _paste_ |
| `KEYBORG_FOCUSIN` constant | _paste_ | _paste_ | _paste_ |

## Test plan
- [ ] `npm run lint` clean
- [ ] `npm run format` clean
- [ ] `npm run build` succeeds
- [ ] `npm test` (Playwright) green
- [ ] `npm run bundle-size` shows no regression

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: `gh` prints the PR URL.

- [ ] **Step 10: Fill in the bundle-size table**

Edit the PR description on GitHub (or via `gh pr edit`) and replace the `_paste_` placeholders with the before/after numbers from Task 1, Step 3 and Task 5, Step 5. Compute the `Delta` column as `(after − before)` in bytes or as a percentage.

---

## Out of scope for this PR

- Refactoring classes to closures (PR 2, separate plan).
- Measuring ES2022 target (PR 3 spike).
- Measuring plain `tsc` as emitter (PR 4 spike).
- Any public API change.
