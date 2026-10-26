export const FOCUSED_CONTROL_CLASS = "focused-gamepad";
export const FOCUSED_ROW_CLASS = "gp-focused-row";

const CONTROL_SELECTOR = "button, input, select, [data-gp-control]";

export interface GpFocusState {
  /**
   * Navigation is lazy: the state starts disengaged and the first
   * directional press places focus without moving it.
   */
  engaged: boolean;
  rowIndex: number;
  controlIndex: number;
}

export function initialFocusState(): GpFocusState {
  return { engaged: false, rowIndex: 0, controlIndex: 0 };
}

export function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}

/**
 * Row movement keeps the control index so that moving between rows of
 * equal structure stays aligned; the consumer clamps it against the
 * actual control count of the new row.
 */
export function moveRow(
  state: GpFocusState,
  delta: 1 | -1,
  rowCount: number,
): GpFocusState {
  if (!state.engaged) return { engaged: true, rowIndex: 0, controlIndex: 0 };
  return {
    engaged: true,
    rowIndex: clampIndex(state.rowIndex + delta, rowCount),
    controlIndex: state.controlIndex,
  };
}

export function moveControl(
  state: GpFocusState,
  delta: 1 | -1,
  controlCount: number,
): GpFocusState {
  if (!state.engaged) return { engaged: true, rowIndex: 0, controlIndex: 0 };
  return {
    engaged: true,
    rowIndex: state.rowIndex,
    controlIndex: clampIndex(state.controlIndex + delta, controlCount),
  };
}

export function isVisible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0;
}

export function collectControls(row: HTMLElement): HTMLElement[] {
  const controls = Array.from(
    row.querySelectorAll<HTMLElement>(CONTROL_SELECTOR),
  ).filter((el) => isVisible(el) && !(el as HTMLButtonElement).disabled);
  // a synthesized row can be a control itself (a bare checkbox between
  // layout blocks); the row then holds exactly itself
  if (row.matches(CONTROL_SELECTOR)) {
    controls.unshift(row);
  }
  return controls;
}

/** Visible `data-gp-row` elements that contain at least one visible control. */
export function collectRows(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-gp-row]")).filter(
    (row) => isVisible(row) && collectControls(row).length > 0,
  );
}

/** All visible, enabled controls in the subtree, in document order. */
export function collectDeepControls(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(CONTROL_SELECTOR),
  ).filter((el) => isVisible(el) && !(el as HTMLButtonElement).disabled);
}

/**
 * Fork: gamepad support — derives rows from the DOM for windows without
 * `data-gp-row` markers, by recursively partitioning the layout: an element
 * whose visible enabled controls are all direct children is one row; when an
 * element mixes direct controls with several control-bearing sub-blocks
 * (e.g. bare checkboxes between settings blocks), each direct control
 * becomes a row of its own and the sub-blocks are partitioned in turn.
 * Controls in `excluded` (already covered by marked rows) are ignored.
 * Returns visible row elements in document order.
 */
export function synthesizeRows(
  root: HTMLElement,
  excluded: ReadonlySet<HTMLElement> = new Set(),
): HTMLElement[] {
  const controlSet = new Set(
    collectDeepControls(root).filter((c) => !excluded.has(c)),
  );
  if (!controlSet.size) return [];

  const rows: HTMLElement[] = [];

  const visit = (el: HTMLElement) => {
    const direct: HTMLElement[] = [];
    const containers: HTMLElement[] = [];
    for (const child of Array.from(el.children) as HTMLElement[]) {
      if (controlSet.has(child)) {
        direct.push(child);
      } else if (
        Array.from(child.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)).some(
          (c) => controlSet.has(c),
        )
      ) {
        containers.push(child);
      }
    }

    if (!direct.length) {
      for (const container of containers) visit(container);
    } else if (containers.length <= 1) {
      // a leaf row, or one whose single sub-wrapper (e.g. a popover target)
      // belongs to the same row
      rows.push(el);
    } else {
      // composite layout (e.g. bare checkboxes between settings blocks):
      // the direct controls stand alone, the sub-blocks are partitioned
      // recursively
      rows.push(...direct);
      for (const container of containers) visit(container);
    }
  };
  visit(root);

  return rows
    .filter((row) => isVisible(row) && collectControls(row).length > 0)
    .sort((a, b) =>
      // Node.DOCUMENT_POSITION_FOLLOWING (the constant is not available in
      // the node test environment)
      a.compareDocumentPosition(b) & 4 ? -1 : 1,
    );
}

export function clearFocusVisual(root: HTMLElement) {
  for (const el of root.querySelectorAll(`.${FOCUSED_CONTROL_CLASS}`)) {
    el.classList.remove(FOCUSED_CONTROL_CLASS);
  }
  for (const el of root.querySelectorAll(`.${FOCUSED_ROW_CLASS}`)) {
    el.classList.remove(FOCUSED_ROW_CLASS);
  }
}

/**
 * Applies the focus classes for the state, clamping the indexes against
 * the actual DOM. Rows can be precomputed by the caller (marked or
 * synthesized); the focused control is scrolled into view (nearest edge)
 * so navigation works inside scrollable windows. Returns the focused
 * control, if any.
 */
export function applyFocusVisual(
  root: HTMLElement,
  state: GpFocusState,
  options: {
    rows?: HTMLElement[];
    scrollIntoView?: (el: HTMLElement) => void;
  } = {},
): { row: HTMLElement; control: HTMLElement } | undefined {
  clearFocusVisual(root);
  const rows = options.rows ?? collectRows(root);
  if (!rows.length) return undefined;
  const row = rows[clampIndex(state.rowIndex, rows.length)];
  const controls = collectControls(row);
  if (!controls.length) return undefined;
  const control = controls[clampIndex(state.controlIndex, controls.length)];
  row.classList.add(FOCUSED_ROW_CLASS);
  control.classList.add(FOCUSED_CONTROL_CLASS);
  if (options.scrollIntoView) {
    options.scrollIntoView(control);
  } else if (typeof control.scrollIntoView === "function") {
    control.scrollIntoView({ block: "nearest" });
  }
  return { row, control };
}

/**
 * Activates the focused control the way a mouse would: click for buttons
 * and checkboxes, DOM focus for text inputs (no on-screen keyboard yet),
 * value stepping for native selects (their popups cannot be driven).
 */
export function activateControl(control: HTMLElement) {
  if (control instanceof HTMLInputElement && control.type === "checkbox") {
    control.click();
    return;
  }
  if (control instanceof HTMLSelectElement) {
    stepSelect(control, 1);
    return;
  }
  if (control instanceof HTMLInputElement) {
    control.focus();
    return;
  }
  // Dispatch as a real mouse click (detail 1): some components distinguish
  // programmatic activation (e.detail === 0, e.g. from el.click()) from
  // mouse clicks and treat the former as "apply + search" instead of
  // toggling (see FilterModifier.toggleFilter).
  control.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      detail: 1,
      view: window,
    }),
  );
}

/** Changes a native select value without opening its popup. */
export function stepSelect(select: HTMLSelectElement, delta: 1 | -1) {
  const options = Array.from(select.options);
  let index = select.selectedIndex;
  do {
    index += delta;
  } while (index >= 0 && index < options.length && options[index].disabled);
  if (index < 0 || index >= options.length) return;
  select.value = options[index].value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Fork: gamepad support — computes the focus state after a section jump:
 * the first row of the next section after the current row's section,
 * wrapping around. `rowSections` maps each row index to its section index
 * (-1 = outside any section). Returns null when there is nothing to jump to.
 */
export function jumpToNextSection(
  state: GpFocusState,
  rowSections: number[],
  sectionCount: number,
): GpFocusState | null {
  if (sectionCount <= 0 || !rowSections.length) return null;
  const currentRow = state.engaged
    ? clampIndex(state.rowIndex, rowSections.length)
    : -1;
  const current = currentRow >= 0 ? rowSections[currentRow] : -1;
  for (let step = 1; step <= sectionCount; step++) {
    const target =
      (((current + step) % sectionCount) + sectionCount) % sectionCount;
    const firstRow = rowSections.indexOf(target);
    if (firstRow !== -1) {
      return { engaged: true, rowIndex: firstRow, controlIndex: 0 };
    }
  }
  return null;
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  const disengaged = initialFocusState();

  it("lazy entry places focus on the first row without moving", () => {
    expect(moveRow(disengaged, 1, 5)).toEqual({
      engaged: true,
      rowIndex: 0,
      controlIndex: 0,
    });
    expect(moveControl(disengaged, -1, 5)).toEqual({
      engaged: true,
      rowIndex: 0,
      controlIndex: 0,
    });
  });

  it("moves rows and clamps at the edges", () => {
    const state = { engaged: true, rowIndex: 2, controlIndex: 1 };
    expect(moveRow(state, 1, 5)).toEqual({
      engaged: true,
      rowIndex: 3,
      controlIndex: 1,
    });
    expect(moveRow(state, 1, 3)).toEqual({
      engaged: true,
      rowIndex: 2,
      controlIndex: 1,
    });
    expect(moveRow(state, -1, 3)).toEqual({
      engaged: true,
      rowIndex: 1,
      controlIndex: 1,
    });
    expect(moveRow(state, -1, 3).rowIndex).toBeGreaterThanOrEqual(0);
  });

  it("keeps the control index across rows and clamps it", () => {
    const state = { engaged: true, rowIndex: 1, controlIndex: 3 };
    expect(moveRow(state, 1, 5)).toEqual({
      engaged: true,
      rowIndex: 2,
      controlIndex: 3,
    });
    expect(moveControl(state, 1, 4).controlIndex).toBe(3);
    expect(moveControl(state, 1, 2).controlIndex).toBe(1);
    expect(moveControl(state, -1, 2).controlIndex).toBe(1);
  });

  it("jumps to the first row of the next section, wrapping", () => {
    // rows 0-1 in section 0, rows 2-3 in section 1, row 4 in section 2
    const rowSections = [0, 0, 1, 1, 2];
    const state = { engaged: true, rowIndex: 1, controlIndex: 1 };

    expect(jumpToNextSection(state, rowSections, 3)).toEqual({
      engaged: true,
      rowIndex: 2,
      controlIndex: 0,
    });
    expect(
      jumpToNextSection({ ...state, rowIndex: 3 }, rowSections, 3),
    ).toEqual({
      engaged: true,
      rowIndex: 4,
      controlIndex: 0,
    });
    expect(
      jumpToNextSection({ ...state, rowIndex: 4 }, rowSections, 3),
    ).toEqual({
      engaged: true,
      rowIndex: 0,
      controlIndex: 0,
    });
  });

  it("jumps from a disengaged state to the first section", () => {
    const rowSections = [0, 0, 1, 1];
    expect(jumpToNextSection(initialFocusState(), rowSections, 2)).toEqual({
      engaged: true,
      rowIndex: 0,
      controlIndex: 0,
    });
  });

  it("skips sections without rows and reports nothing to jump to", () => {
    // section 0 has no rows; the jump from section 1 wraps into section 2
    const rowSections = [-1, 1, 2];
    expect(
      jumpToNextSection(
        { engaged: true, rowIndex: 1, controlIndex: 0 },
        rowSections,
        3,
      ),
    ).toEqual({
      engaged: true,
      rowIndex: 2,
      controlIndex: 0,
    });
    expect(jumpToNextSection(initialFocusState(), [0, 0], 0)).toBeNull();
    expect(jumpToNextSection(initialFocusState(), [-1, -1], 1)).toBeNull();
  });

  // DOM tree stub for synthesizeRows: parent links, contains, document
  // order and the two selectors the engine queries
  interface TreeEl {
    tag: string;
    children: TreeEl[];
    parentElement: TreeEl | null;
    visible: boolean;
    disabled: boolean;
    isControl: boolean;
    gpRow: boolean;
    order: number;
    getClientRects(): unknown[];
    classList: { add(c: string): void; remove(c: string): void };
    matches(selector: string): boolean;
    querySelectorAll(selector: string): TreeEl[];
    contains(other: TreeEl | null): boolean;
    compareDocumentPosition(other: TreeEl): number;
  }

  function el(
    tag: string,
    opts: {
      visible?: boolean;
      disabled?: boolean;
      control?: boolean;
      row?: boolean;
    } = {},
    children: TreeEl[] = [],
  ): TreeEl {
    const node: TreeEl = {
      tag,
      children: [],
      parentElement: null,
      visible: opts.visible ?? true,
      disabled: opts.disabled ?? false,
      isControl: opts.control ?? ["button", "input", "select"].includes(tag),
      gpRow: opts.row ?? false,
      order: 0,
      getClientRects: () => (node.visible ? [{}] : []),
      classList: {
        add: () => {},
        remove: () => {},
      },
      matches: (selector: string) =>
        selector !== "[data-gp-row]" && node.isControl,
      contains(other) {
        return node.children.some(
          (child) => child === other || child.contains(other),
        );
      },
      compareDocumentPosition(other) {
        // FOLLOWING (4) / PRECEDING (2) by pre-order index
        return other.order > node.order ? 4 : 2;
      },
      querySelectorAll(selector: string) {
        const out: TreeEl[] = [];
        const visit = (n: TreeEl) => {
          for (const child of n.children) {
            if (matches(child, selector)) out.push(child);
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

  function matches(n: TreeEl, selector: string): boolean {
    if (selector === "[data-gp-row]") return n.gpRow;
    // "button, input, select, [data-gp-control]"
    return n.isControl;
  }

  function indexTree(root: TreeEl) {
    let i = 0;
    const visit = (n: TreeEl) => {
      n.order = i++;
      for (const child of n.children) visit(child);
    };
    visit(root);
  }

  function asHtml(n: TreeEl): HTMLElement {
    return n as unknown as HTMLElement;
  }

  it("synthesizes one row per wrapped setting block", () => {
    const input = el("input");
    const select = el("select");
    const block1 = el("div", {}, [el("div"), input]);
    const block2 = el("div", {}, [select]);
    const page = el("div", {}, [block1, block2]);
    indexTree(page);

    const rows = synthesizeRows(asHtml(page));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe(asHtml(block1));
    expect(rows[1]).toBe(asHtml(block2));
  });

  it("groups a flat toolbar into one row", () => {
    const page = el("div", {}, [el("button"), el("button"), el("button")]);
    indexTree(page);

    const rows = synthesizeRows(asHtml(page));

    expect(rows).toEqual([asHtml(page)]);
  });

  it("keeps two controls sharing a block in one row", () => {
    const checkbox = el("input");
    const select = el("select");
    const block = el("div", {}, [checkbox, select]);
    const page = el("div", {}, [block]);
    indexTree(page);

    const rows = synthesizeRows(asHtml(page));

    expect(rows).toEqual([asHtml(block)]);
  });

  it("merges a private wrapper into the sibling control's row", () => {
    const input = el("input");
    const select = el("select");
    const block = el("div", {}, [el("div", {}, [input]), select]);
    const page = el("div", {}, [block]);
    indexTree(page);

    const rows = synthesizeRows(asHtml(page));

    expect(rows).toEqual([asHtml(block)]);
  });

  it("rows a lone nested control at its immediate wrapper", () => {
    const wrap = el("div", {}, [el("button")]);
    const page = el("div", {}, [wrap]);
    indexTree(page);

    const rows = synthesizeRows(asHtml(page));

    expect(rows).toEqual([asHtml(wrap)]);
  });

  it("splits bare controls of a composite layout into singleton rows", () => {
    // a settings page: bare checkboxes between several wrapped blocks
    const cb1 = el("input");
    const cb2 = el("input");
    const select = el("select");
    const block1 = el("div", {}, [select]);
    const block2 = el("div", {}, [el("button")]);
    const page = el("div", {}, [cb1, cb2, block1, block2]);
    indexTree(page);

    const rows = synthesizeRows(asHtml(page));

    expect(rows).toEqual([
      asHtml(cb1),
      asHtml(cb2),
      asHtml(block1),
      asHtml(block2),
    ]);
    expect(collectControls(asHtml(cb1))).toEqual([asHtml(cb1)]);
  });

  it("keeps one row when a single sub-wrapper sits beside direct controls", () => {
    // a toolbar with an inline popover target: still one row
    const b1 = el("button");
    const b2 = el("button");
    const trigger = el("button");
    const popover = el("span", {}, [trigger]);
    const bar = el("div", {}, [b1, b2, popover]);
    const page = el("div", {}, [bar]);
    indexTree(page);

    const rows = synthesizeRows(asHtml(page));

    expect(rows).toEqual([asHtml(bar)]);
    expect(collectControls(asHtml(bar))).toEqual([
      asHtml(b1),
      asHtml(b2),
      asHtml(trigger),
    ]);
  });

  it("skips disabled and invisible controls", () => {
    const page = el("div", {}, [
      el("button"),
      el("button", { disabled: true }),
      el("button", { visible: false }),
    ]);
    indexTree(page);

    expect(synthesizeRows(asHtml(page))).toEqual([asHtml(page)]);
    expect(
      synthesizeRows(
        asHtml(
          el("div", {}, [
            el("button", { disabled: true }),
            el("button", { visible: false }),
          ]),
        ),
      ),
    ).toEqual([]);
  });

  it("ignores excluded controls", () => {
    const b1 = el("button");
    const b1b = el("button");
    const b2 = el("button");
    const b2b = el("button");
    const block1 = el("div", {}, [b1, b1b]);
    const block2 = el("div", {}, [b2, b2b]);
    const page = el("div", {}, [block1, block2]);
    indexTree(page);

    expect(synthesizeRows(asHtml(page))).toEqual([
      asHtml(block1),
      asHtml(block2),
    ]);
    // partially covered blocks keep the row of their remaining controls
    expect(synthesizeRows(asHtml(page), new Set([asHtml(b1)]))).toEqual([
      asHtml(block1),
      asHtml(block2),
    ]);
    // a block whose controls are all covered yields no row
    expect(
      synthesizeRows(asHtml(page), new Set([asHtml(b1), asHtml(b1b)])),
    ).toEqual([asHtml(block2)]);
  });

  it("orders synthesized rows by document position", () => {
    const b = el("button");
    const late = el("div", {}, [b]);
    const early = el("div", {}, [el("button")]);
    const page = el("div", {}, [late, early]);
    indexTree(page);

    const rows = synthesizeRows(asHtml(page));

    expect(rows).toEqual([asHtml(late), asHtml(early)]);
  });

  it("scrolls the focused control into view through the injected hook", () => {
    const row1 = el("div", { row: true }, [el("button")]);
    const row2 = el("div", { row: true }, [el("button")]);
    const root = el("div", {}, [row1, row2]);
    indexTree(root);

    const scrolled: unknown[] = [];
    applyFocusVisual(
      asHtml(root),
      { engaged: true, rowIndex: 1, controlIndex: 0 },
      {
        rows: [asHtml(row1), asHtml(row2)],
        scrollIntoView: (control) => scrolled.push(control),
      },
    );

    expect(scrolled).toEqual([row2.children[0]]);
  });

  it("scrolls through the default nearest-edge behavior when available", () => {
    const row = el("div", { row: true }, [el("button")]);
    const root = el("div", {}, [row]);
    indexTree(root);
    const calls: unknown[][] = [];
    const control = row.children[0] as TreeEl & {
      scrollIntoView?: (...args: unknown[]) => void;
    };
    control.scrollIntoView = (...args: unknown[]) => calls.push(args);

    applyFocusVisual(asHtml(root), {
      engaged: true,
      rowIndex: 0,
      controlIndex: 0,
    });

    expect(calls).toEqual([[{ block: "nearest" }]]);
  });
}
