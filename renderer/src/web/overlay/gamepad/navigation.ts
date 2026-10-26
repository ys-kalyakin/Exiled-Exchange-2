import {
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  watch,
} from "vue";
import { Host } from "@/web/background/IPC";
import { AppConfig } from "@/web/Config";
import type { Widget, WidgetManager } from "../interfaces";
import { createIntentSource } from "./intents";
import {
  activateControl,
  applyFocusVisual,
  clampIndex,
  clearFocusVisual,
  collectControls,
  collectRows,
  initialFocusState,
  jumpToNextSection,
  stepSelect,
  synthesizeRows,
} from "./focusEngine";
import type {
  GamepadNavScope,
  GamepadPopoverRegistry,
  GamepadScopeRegistry,
  GpIntent,
} from "./types";
import { gamepadPopoverRegistryKey, gamepadScopeRegistryKey } from "./types";

export interface NavigatorDeps {
  topScope: () => GamepadNavScope | undefined;
  findScope: (wmId: number) => GamepadNavScope | undefined;
  getPopoverClosers: () => Array<() => void>;
  closeOverlay: () => void;
}

/**
 * Rows of a scope's window: explicit `data-gp-row` markers when present
 * (also for scopes without synthesis), otherwise — for scopes that opted
 * in — rows derived from the DOM structure.
 */
export function rowsForScope(
  scope: GamepadNavScope,
  root: HTMLElement,
): HTMLElement[] {
  const marked = collectRows(root);
  if (!scope.synthesizeRows || marked.length) return marked;
  return synthesizeRows(root);
}

/**
 * Fork: gamepad support — intent router of the gamepad navigation, extracted
 * from the Vue wiring so it can be tested without a DOM. Delivers intents to
 * the topmost scope: two-level focus movement, activation, shortcut actions
 * (action intents, plus the generic section jump) and the B-button back
 * chain (popover -> window -> unpin). Keeps per-window focus memory across
 * hide/show, keyed by wmId + the scope's focusKey (item type for price
 * check).
 */
export function createGamepadNavigator(deps: NavigatorDeps) {
  let focusState = initialFocusState();
  let focusWmId: number | null = null;
  const focusMemory = new Map<
    string,
    { rowIndex: number; controlIndex: number }
  >();

  function memoryKeyFor(scope: GamepadNavScope): string {
    return `${scope.wmId}:${scope.focusKey?.() ?? ""}`;
  }

  function rememberFocus(scope: GamepadNavScope | undefined) {
    if (!scope || !focusState.engaged) return;
    focusMemory.set(memoryKeyFor(scope), {
      rowIndex: focusState.rowIndex,
      controlIndex: focusState.controlIndex,
    });
  }

  function resetFocusFor(scope: GamepadNavScope) {
    if (focusWmId === scope.wmId) return;
    if (focusWmId !== null) {
      const previous = deps.findScope(focusWmId);
      rememberFocus(previous);
      const previousRoot = previous?.root();
      if (previousRoot) clearFocusVisual(previousRoot);
    }
    focusState = initialFocusState();
    focusWmId = scope.wmId;
  }

  function dispatch(intent: GpIntent) {
    if (intent.kind === "back") {
      handleBack();
      return;
    }

    if (intent.kind === "action") {
      // shortcut actions run without prior focus engagement
      const actionScope = deps.topScope();
      if (!actionScope) return;
      if (intent.action === "section") {
        jumpSection(actionScope);
      } else {
        actionScope.runAction?.(intent.action);
      }
      return;
    }

    const scope = deps.topScope();
    if (!scope) return;
    const root = scope.root();
    if (!root) return;
    resetFocusFor(scope);

    if (intent.kind === "activate") {
      if (!focusState.engaged) return;
      const focused = applyFocusVisual(root, focusState, {
        rows: rowsForScope(scope, root),
      });
      if (focused) {
        activateControl(focused.control);
        refocusAfterActivation(scope);
      }
      return;
    }

    const rows = rowsForScope(scope, root);
    if (!rows.length) {
      focusState = { ...focusState, engaged: false };
      clearFocusVisual(root);
      return;
    }

    if (!focusState.engaged) {
      // lazy entry: the first directional press places focus, restoring the
      // remembered row for this window/item type when there is one
      const remembered = focusMemory.get(memoryKeyFor(scope));
      focusState = {
        engaged: true,
        rowIndex: remembered
          ? Math.min(remembered.rowIndex, rows.length - 1)
          : 0,
        controlIndex: remembered ? remembered.controlIndex : 0,
      };
      if (remembered) {
        const controls = collectControls(rows[focusState.rowIndex]);
        focusState.controlIndex = Math.min(
          focusState.controlIndex,
          Math.max(controls.length - 1, 0),
        );
      }
      applyFocusVisual(root, focusState, { rows });
      return;
    }

    const rowIndex = Math.min(focusState.rowIndex, rows.length - 1);
    const controls = collectControls(rows[rowIndex]);
    const controlIndex = Math.min(
      focusState.controlIndex,
      Math.max(controls.length - 1, 0),
    );
    const current = controls[controlIndex];

    if (intent.axis === "control" && current instanceof HTMLSelectElement) {
      stepSelect(current, intent.delta);
      return;
    }

    if (intent.axis === "row") {
      focusState = {
        engaged: true,
        rowIndex: clampIndex(rowIndex + intent.delta, rows.length),
        controlIndex,
      };
    } else {
      focusState = {
        engaged: true,
        rowIndex,
        controlIndex: clampIndex(controlIndex + intent.delta, controls.length),
      };
    }
    applyFocusVisual(root, focusState, { rows });
  }

  /**
   * Re-applies the focus visuals after an activation: the activated control
   * may re-render with a different class binding (a stat color cycle, an
   * active menu entry), which overwrites the imperative focus classes once
   * Vue flushes the update. Clamps the state against the re-collected rows
   * so a re-render that removed rows cannot leave it out of range.
   */
  function refocusAfterActivation(scope: GamepadNavScope) {
    nextTick(() => {
      if (focusWmId !== scope.wmId || !focusState.engaged) return;
      const current = deps.topScope();
      if (!current || current.wmId !== scope.wmId) return;
      const currentRoot = current.root();
      if (!currentRoot) return;
      const rows = rowsForScope(current, currentRoot);
      if (!rows.length) {
        focusState = { ...focusState, engaged: false };
        clearFocusVisual(currentRoot);
        return;
      }
      const rowIndex = Math.min(focusState.rowIndex, rows.length - 1);
      const controls = collectControls(rows[rowIndex]);
      focusState = {
        engaged: true,
        rowIndex,
        controlIndex: Math.min(
          focusState.controlIndex,
          Math.max(controls.length - 1, 0),
        ),
      };
      applyFocusVisual(currentRoot, focusState, { rows });
    });
  }

  function jumpSection(scope: GamepadNavScope) {
    const root = scope.root();
    if (!root) return;
    const rows = rowsForScope(scope, root);
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>("[data-gp-section]"),
    );
    const rowSections = rows.map((row) =>
      sections.findIndex((section) => section.contains(row)),
    );
    const target = jumpToNextSection(focusState, rowSections, sections.length);
    if (!target) return;
    resetFocusFor(scope);
    focusState = target;
    applyFocusVisual(root, focusState, { rows });
  }

  function handleBack() {
    // the topmost open popover closes first
    const closers = deps.getPopoverClosers();
    if (closers.length) {
      closers[closers.length - 1]();
      return;
    }
    const scope = deps.topScope();
    if (scope?.requestClose()) return;
    deps.closeOverlay();
  }

  /** Drops focus visuals on hide, remembering the row for the next show. */
  function handleScopeHidden(scope: GamepadNavScope | undefined) {
    if (focusWmId === null || scope?.wmId !== focusWmId) return;
    rememberFocus(scope);
    const root = scope.root();
    if (root) clearFocusVisual(root);
    focusState = initialFocusState();
    focusWmId = null;
  }

  function focusedWmId(): number | null {
    return focusWmId;
  }

  return { dispatch, handleScopeHidden, focusedWmId };
}

/**
 * Wires gamepad (and keyboard) navigation into the overlay window:
 * intent source -> topmost registered scope -> the gamepad navigator.
 */
export function useGamepadNavigation(wm: WidgetManager) {
  const scopes = shallowRef<GamepadNavScope[]>([]);
  const popoverClosers: Array<() => void> = [];

  provide<GamepadScopeRegistry>(gamepadScopeRegistryKey, {
    add(scope) {
      scopes.value = [...scopes.value, scope];
      return () => {
        scopes.value = scopes.value.filter((s) => s !== scope);
      };
    },
  });

  provide<GamepadPopoverRegistry>(gamepadPopoverRegistryKey, {
    add(close) {
      popoverClosers.push(close);
      return () => {
        const index = popoverClosers.indexOf(close);
        if (index !== -1) popoverClosers.splice(index, 1);
      };
    },
  });

  /** The topmost shown widget must itself be a registered scope. */
  function topScope(): GamepadNavScope | undefined {
    const shownWidgets = wm.widgets.value.filter((w) => w.wmWants === "show");
    if (!shownWidgets.length) return undefined;
    const zorder = (w: Widget) =>
      typeof w.wmZorder === "number"
        ? w.wmZorder
        : w.wmZorder === "exclusive"
          ? Number.MAX_SAFE_INTEGER
          : -1;
    const topmost = shownWidgets.reduce((top, w) =>
      zorder(w) > zorder(top) ? w : top,
    );
    return scopes.value.find((s) => s.wmId === topmost.wmId && s.canNavigate());
  }

  const navigator = createGamepadNavigator({
    topScope,
    findScope: (wmId) => scopes.value.find((s) => s.wmId === wmId),
    getPopoverClosers: () => popoverClosers,
    closeOverlay: () => {
      if (Host.isElectron) {
        Host.sendEvent({
          name: "OVERLAY->MAIN::focus-game",
          payload: undefined,
        });
      }
    },
  });

  const source = createIntentSource({
    onIntent: navigator.dispatch,
    // fork: gamepad support — config-driven button map, timings and toggle
    getGamepadConfig: () => AppConfig().gamepad,
  });
  onBeforeUnmount(() => source.dispose());

  // drop focus visuals when the focused window hides, so a stale ring does
  // not reappear on its next show (widget DOM persists via v-show); the
  // navigator remembers the last focused row for the next show
  watch(
    () => wm.widgets.value.map((w) => `${w.wmId}:${w.wmWants}`).join(","),
    () => {
      const focusedWmId = navigator.focusedWmId();
      if (focusedWmId === null) return;
      const widget = wm.widgets.value.find((w) => w.wmId === focusedWmId);
      if (widget && widget.wmWants !== "show") {
        navigator.handleScopeHidden(
          scopes.value.find((s) => s.wmId === focusedWmId),
        );
      }
    },
  );

  return {
    dispose: () => source.dispose(),
  };
}

/** Registers the calling window as a navigable scope. */
export function useGamepadNavScope(scope: GamepadNavScope) {
  const registry = inject(gamepadScopeRegistryKey, null);
  if (!registry) return;
  let remove: (() => void) | undefined;
  onMounted(() => {
    remove = registry.add(scope);
  });
  onBeforeUnmount(() => remove?.());
}

/**
 * Fork: gamepad support — registers a Widget-wrapper-based widget as a
 * navigable scope with DOM-derived rows. The root is the widget's mounted
 * element (`#widget-<id>`); B hides the widget the way its own close button
 * does, unless `requestClose` overrides the behavior.
 */
export function useGamepadWidgetScope(
  config: Widget,
  options: {
    requestClose?: () => boolean;
    root?: () => HTMLElement | null | undefined;
  } = {},
) {
  const wm = inject<WidgetManager | null>("wm", null);
  useGamepadNavScope({
    wmId: config.wmId,
    canNavigate: () => config.wmWants === "show",
    root:
      options.root ?? (() => document.getElementById(`widget-${config.wmId}`)),
    requestClose:
      options.requestClose ??
      (() => {
        if (!wm || config.wmWants !== "show") return false;
        wm.hide(config.wmId);
        return true;
      }),
    synthesizeRows: true,
  });
}

if (import.meta.vitest) {
  const { it, expect, vi } = import.meta.vitest;

  // minimal DOM stubs: enough for collectRows/collectControls/applyFocusVisual
  function fakeControl() {
    const classes = new Set<string>();
    return {
      disabled: false,
      getClientRects: () => [{}, {}],
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
      },
      hasClass: (c: string) => classes.has(c),
      dispatchEvent: () => {},
      matches: () => false,
    };
  }

  function fakeRoot(rows: number[]) {
    const rowClasses: Set<string>[] = [];
    const rowControls: ReturnType<typeof fakeControl>[][] = [];
    const rowEls = rows.map((controls) => {
      const classes = new Set<string>();
      rowClasses.push(classes);
      // stable per-row control objects so focus re-application after an
      // activation lands on the same stubs the assertions inspect
      const rowControlStubs = Array.from({ length: controls }, () =>
        fakeControl(),
      );
      rowControls.push(rowControlStubs);
      return {
        getClientRects: () => [{}],
        classList: {
          add: (c: string) => classes.add(c),
          remove: (c: string) => classes.delete(c),
        },
        matches: () => false,
        querySelectorAll: () => rowControlStubs,
      };
    });
    return {
      rowClasses,
      rowControls,
      querySelectorAll: (selector: string) => {
        if (selector === "[data-gp-row]") return rowEls;
        // class cleanup: removing from every row is a no-op for rows
        // without the class, which emulates clearFocusVisual
        if (selector.startsWith(".")) return rowEls;
        return []; // [data-gp-section]
      },
    };
  }

  function createHarness() {
    const scopes: GamepadNavScope[] = [];
    const popoverClosers: Array<() => void> = [];
    let overlayClosed = false;
    const navigator = createGamepadNavigator({
      topScope: () => scopes.find((s) => s.canNavigate()),
      findScope: (wmId) => scopes.find((s) => s.wmId === wmId),
      getPopoverClosers: () => popoverClosers,
      closeOverlay: () => {
        overlayClosed = true;
      },
    });
    return {
      navigator,
      scopes,
      popoverClosers,
      wasOverlayClosed: () => overlayClosed,
    };
  }

  it("delivers action intents to the topmost scope without focus engagement", () => {
    const { navigator, scopes } = createHarness();
    const actions: string[] = [];
    scopes.push({
      wmId: 1,
      canNavigate: () => true,
      root: () => null,
      requestClose: () => false,
      runAction: (action) => {
        actions.push(action);
        return true;
      },
    });

    navigator.dispatch({ kind: "action", action: "search" });

    expect(actions).toEqual(["search"]);
  });

  it("ignores action intents when no scope can navigate", () => {
    const { navigator, scopes } = createHarness();
    scopes.push({
      wmId: 1,
      canNavigate: () => false,
      root: () => null,
      requestClose: () => false,
      runAction: () => {
        throw new Error("must not be called");
      },
    });

    navigator.dispatch({ kind: "action", action: "search" });
  });

  it("runs the back chain: window close, then unpin", () => {
    const { navigator, scopes, wasOverlayClosed } = createHarness();
    let shown = true;
    scopes.push({
      wmId: 1,
      canNavigate: () => shown,
      root: () => null,
      requestClose: () => {
        shown = false;
        return true;
      },
    });

    navigator.dispatch({ kind: "back" });
    expect(wasOverlayClosed()).toBe(false);

    navigator.dispatch({ kind: "back" });
    expect(wasOverlayClosed()).toBe(true);
  });

  it("closes the topmost popover first", () => {
    const { navigator, popoverClosers } = createHarness();
    const closed: number[] = [];
    popoverClosers.push(() => closed.push(1));
    popoverClosers.push(() => closed.push(2));

    navigator.dispatch({ kind: "back" });

    expect(closed).toEqual([2]);
  });

  it("remembers the focused row of a hidden scope and restores it", () => {
    const { navigator, scopes } = createHarness();
    const root = fakeRoot([1, 1, 1]);
    const scope: GamepadNavScope = {
      wmId: 1,
      canNavigate: () => true,
      root: () => root as unknown as HTMLElement,
      requestClose: () => false,
      focusKey: () => "Ring",
    };
    scopes.push(scope);

    navigator.dispatch({ kind: "move", axis: "row", delta: 1 }); // engage row 0
    navigator.dispatch({ kind: "move", axis: "row", delta: 1 }); // move to row 1
    navigator.handleScopeHidden(scope); // hide: remembers row 1
    navigator.dispatch({ kind: "move", axis: "row", delta: 1 }); // re-engage

    expect(root.rowClasses[1].has("gp-focused-row")).toBe(true);
    expect(root.rowClasses[0].has("gp-focused-row")).toBe(false);
  });

  it("focus memory is keyed by the scope's focus key", () => {
    const { navigator, scopes } = createHarness();
    let focusKey: string | undefined = "Ring";
    const root = fakeRoot([1, 1, 1]);
    const scope: GamepadNavScope = {
      wmId: 1,
      canNavigate: () => true,
      root: () => root as unknown as HTMLElement,
      requestClose: () => false,
      focusKey: () => focusKey,
    };
    scopes.push(scope);

    navigator.dispatch({ kind: "move", axis: "row", delta: 1 });
    navigator.dispatch({ kind: "move", axis: "row", delta: 1 }); // row 1
    navigator.handleScopeHidden(scope);

    focusKey = "Gem"; // different item type: no memory
    navigator.dispatch({ kind: "move", axis: "row", delta: 1 });

    expect(root.rowClasses[0].has("gp-focused-row")).toBe(true);
  });

  it("clamps the remembered row against a shorter row list", () => {
    const { navigator, scopes } = createHarness();
    const rootRef = { current: fakeRoot([1, 1, 1]) };
    const scope: GamepadNavScope = {
      wmId: 1,
      canNavigate: () => true,
      root: () => rootRef.current as unknown as HTMLElement,
      requestClose: () => false,
    };
    scopes.push(scope);

    navigator.dispatch({ kind: "move", axis: "row", delta: 1 });
    navigator.dispatch({ kind: "move", axis: "row", delta: 1 });
    navigator.dispatch({ kind: "move", axis: "row", delta: 1 }); // row 2
    navigator.handleScopeHidden(scope);

    rootRef.current = fakeRoot([1]); // item re-rendered with one row
    navigator.dispatch({ kind: "move", axis: "row", delta: 1 });

    expect(rootRef.current.rowClasses[0].has("gp-focused-row")).toBe(true);
  });

  it("re-applies focus classes after the activation re-renders the control", async () => {
    // constructor functions instead of empty classes: instanceof checks in
    // activateControl must see the stubs, and the linter forbids empty classes
    vi.stubGlobal("MouseEvent", function MouseEvent() {});
    vi.stubGlobal("HTMLInputElement", function HTMLInputElement() {});
    vi.stubGlobal("HTMLSelectElement", function HTMLSelectElement() {});
    vi.stubGlobal("window", {});
    const { navigator, scopes } = createHarness();
    const root = fakeRoot([1]);
    const control = root.rowControls[0][0];
    scopes.push({
      wmId: 1,
      canNavigate: () => true,
      root: () => root as unknown as HTMLElement,
      requestClose: () => false,
    });

    navigator.dispatch({ kind: "move", axis: "row", delta: 1 }); // engage row 0
    navigator.dispatch({ kind: "activate" });
    // Vue re-patches the control's class binding, wiping the imperative ring
    control.classList.remove("focused-gamepad");
    await nextTick();

    expect(control.hasClass("focused-gamepad")).toBe(true);
    expect(root.rowClasses[0].has("gp-focused-row")).toBe(true);
    vi.unstubAllGlobals();
  });

  it("clamps the focus state when the activation re-render removes rows", async () => {
    // constructor functions instead of empty classes: instanceof checks in
    // activateControl must see the stubs, and the linter forbids empty classes
    vi.stubGlobal("MouseEvent", function MouseEvent() {});
    vi.stubGlobal("HTMLInputElement", function HTMLInputElement() {});
    vi.stubGlobal("HTMLSelectElement", function HTMLSelectElement() {});
    vi.stubGlobal("window", {});
    const { navigator, scopes } = createHarness();
    const rootRef = { current: fakeRoot([1, 1]) };
    const scope: GamepadNavScope = {
      wmId: 1,
      canNavigate: () => true,
      root: () => rootRef.current as unknown as HTMLElement,
      requestClose: () => false,
    };
    scopes.push(scope);

    navigator.dispatch({ kind: "move", axis: "row", delta: 1 }); // row 0
    navigator.dispatch({ kind: "move", axis: "row", delta: 1 }); // row 1
    navigator.dispatch({ kind: "activate" });
    rootRef.current = fakeRoot([1]); // the re-render dropped a row
    await nextTick();

    expect(rootRef.current.rowClasses[0].has("gp-focused-row")).toBe(true);

    navigator.dispatch({ kind: "move", axis: "row", delta: -1 });
    expect(rootRef.current.rowClasses[0].has("gp-focused-row")).toBe(true);
    vi.unstubAllGlobals();
  });

  // richer tree stub for the synthesis routing: parent links, contains,
  // document order and the selectors the engine queries
  interface TreeEl {
    children: TreeEl[];
    parentElement: TreeEl | null;
    visible: boolean;
    isControl: boolean;
    gpRow: boolean;
    order: number;
    classes: Set<string>;
    getClientRects(): unknown[];
    classList: { add(c: string): void; remove(c: string): void };
    matches(selector: string): boolean;
    querySelectorAll(selector: string): TreeEl[];
    contains(other: TreeEl | null): boolean;
    compareDocumentPosition(other: TreeEl): number;
  }

  function treeNode(
    opts: { visible?: boolean; control?: boolean; row?: boolean } = {},
    children: TreeEl[] = [],
  ): TreeEl {
    const node: TreeEl = {
      children: [],
      parentElement: null,
      visible: opts.visible ?? true,
      isControl: opts.control ?? false,
      gpRow: opts.row ?? false,
      order: 0,
      classes: new Set(),
      getClientRects: () => (node.visible ? [{}] : []),
      classList: {
        add: (c) => node.classes.add(c),
        remove: (c) => node.classes.delete(c),
      },
      matches: (selector: string) =>
        selector !== "[data-gp-row]" && node.isControl,
      contains(other) {
        return node.children.some(
          (child) => child === other || child.contains(other),
        );
      },
      compareDocumentPosition(other) {
        return other.order > node.order ? 4 : 2;
      },
      querySelectorAll(selector: string) {
        const out: TreeEl[] = [];
        const visit = (n: TreeEl) => {
          for (const child of n.children) {
            if (
              selector === "[data-gp-row]"
                ? child.gpRow
                : selector === "[data-gp-section]"
                  ? false
                  : child.isControl
            ) {
              out.push(child);
            }
            visit(child);
          }
        };
        visit(node);
        return out;
      },
    };
    for (const child of children) {
      child.parentElement = node;
      node.children.push(child);
    }
    return node;
  }

  function indexTreeEl(root: TreeEl) {
    let i = 0;
    const visit = (n: TreeEl) => {
      n.order = i++;
      for (const child of n.children) visit(child);
    };
    visit(root);
  }

  it("derives rows from the DOM for a scope with synthesizeRows", () => {
    const { navigator, scopes } = createHarness();
    // two flat buttons on the root: one synthetic row holding both
    const b1 = treeNode({ control: true });
    const b2 = treeNode({ control: true });
    const root = treeNode({}, [b1, b2]);
    indexTreeEl(root);
    scopes.push({
      wmId: 1,
      canNavigate: () => true,
      root: () => root as unknown as HTMLElement,
      requestClose: () => false,
      synthesizeRows: true,
    });

    navigator.dispatch({ kind: "move", axis: "row", delta: 1 });

    expect(root.classes.has("gp-focused-row")).toBe(true);
    expect(b1.classes.has("focused-gamepad")).toBe(true);
  });

  it("prefers marked rows over synthesis for the same scope", () => {
    const { navigator, scopes } = createHarness();
    const markedButton = treeNode({ control: true });
    const marked = treeNode({ row: true }, [markedButton]);
    const stray = treeNode({ control: true });
    const root = treeNode({}, [marked, stray]);
    indexTreeEl(root);
    scopes.push({
      wmId: 1,
      canNavigate: () => true,
      root: () => root as unknown as HTMLElement,
      requestClose: () => false,
      synthesizeRows: true,
    });

    navigator.dispatch({ kind: "move", axis: "row", delta: 1 });

    expect(marked.classes.has("gp-focused-row")).toBe(true);
    expect(markedButton.classes.has("focused-gamepad")).toBe(true);
    expect(stray.classes.has("focused-gamepad")).toBe(false);
  });
}
