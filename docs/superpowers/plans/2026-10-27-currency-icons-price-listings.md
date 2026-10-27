# Currency Icons in Price Listings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the price-check trade listings, each price cell shows the listing's currency icon in a fixed left sub-column so all icons form one vertical line, with the unchanged right-aligned price text next to it.

**Architecture:** Single-component render change in `renderer/src/web/price-check/trade/TradeItem.vue`: the price `<td>` becomes `flex justify-between` — a fixed-width (1.25rem) icon slot at the left edge of the cell, the existing price text + listedTimes chip on the right. Icon art is resolved by a local map over `result.priceCurrency` (lowercased, `G. `/`P. ` prefixes tolerated); currencies without art render an empty slot so the line stays aligned.

**Tech Stack:** Vue 3 SFC (render-layer only), existing static art in `renderer/public/images/` (`divine.png`, `chaos.png`, `exa.png`, `annul.png`).

**Spec:** `openspec/changes/add-game-native-overlay-theme/specs/price-check/spec.md` (delta sentence added by Task 1) + approved short design from conversation.

## Global Constraints

- Motion budget: only `transform`/`opacity` may be animated (no transitions added by this change).
- `data-gp-*` attributes and gamepad code untouched.
- Fork mergeability: keep edits minimal and localized; no upstream reformatting.
- Spec delta updates stay in English (project rule for OpenSpec artifacts).

## Review Focus

- Row priced in a currency without art (`regal`, `transmute`, `aug`, `P. aug`, `"no price"`): expect an empty slot, icons still aligned on the vertical line.
- Row priced in a prefixed id (`G. chaos`, `P. regal`): expect the base-orb art to resolve from the stripped name.
- `listedTimes > 2` chip and the missing-note `?` icon must stay attached to the right edge of the price text.

---

### Task 1: Currency icon sub-column in `TradeItem.vue`

**Files:**
- Modify: `renderer/src/web/price-check/trade/TradeItem.vue`
- Modify: `openspec/changes/add-game-native-overlay-theme/specs/price-check/spec.md` (one sentence in the modified requirement)
- Modify: `openspec/changes/add-game-native-overlay-theme/tasks.md` (new task 4.4)

**Interfaces:**
- Consumes: `result.priceCurrency: string` (existing `PricingResult` field).
- Produces: none (pure render).

- [ ] **Step 1:** Add the spec-delta sentence to the modified requirement: stat/listing polish — each price row shows the listing currency's icon in a fixed left slot; currencies without reserved art keep an empty slot so icons stay vertically aligned.

- [ ] **Step 2:** Add unchecked task `4.4` to `tasks.md`.

- [ ] **Step 3:** Implement in `TradeItem.vue`: wrap the existing price `<td>` content in `flex items-center justify-between`; add the fixed-width icon slot (w-5) with `<img>` when the map resolves, otherwise an empty `w-5` spacer; mapping: `divine|div` → divine.png, `chaos` → chaos.png, `exalted` → exa.png, `annul` → annul.png (lowercase match, `G. `/`P. ` benign); price text markup unchanged inside the right group.

- [ ] **Step 4:** Verify: `cd renderer && npm run build` passes (type-check included). Visual check happens in the already-running dev session via HMR (user verifies the vertical alignment).

- [ ] **Step 5:** Mark task 4.4 `- [x]` in `tasks.md` after the user confirms the visual result (or when build passes and the user has the change visible).
