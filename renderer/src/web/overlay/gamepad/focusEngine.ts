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
  return Array.from(row.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)).filter(
    (el) => isVisible(el) && !(el as HTMLButtonElement).disabled,
  );
}

/** Visible `data-gp-row` elements that contain at least one visible control. */
export function collectRows(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-gp-row]")).filter(
    (row) => isVisible(row) && collectControls(row).length > 0,
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
 * the actual DOM. Returns the focused control, if any.
 */
export function applyFocusVisual(
  root: HTMLElement,
  state: GpFocusState,
): { row: HTMLElement; control: HTMLElement } | undefined {
  clearFocusVisual(root);
  const rows = collectRows(root);
  if (!rows.length) return undefined;
  const row = rows[clampIndex(state.rowIndex, rows.length)];
  const controls = collectControls(row);
  if (!controls.length) return undefined;
  const control = controls[clampIndex(state.controlIndex, controls.length)];
  row.classList.add(FOCUSED_ROW_CLASS);
  control.classList.add(FOCUSED_CONTROL_CLASS);
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
    const target = (((current + step) % sectionCount) + sectionCount) % sectionCount;
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
    expect(jumpToNextSection({ ...state, rowIndex: 3 }, rowSections, 3)).toEqual({
      engaged: true,
      rowIndex: 4,
      controlIndex: 0,
    });
    expect(jumpToNextSection({ ...state, rowIndex: 4 }, rowSections, 3)).toEqual({
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
    expect(jumpToNextSection({ engaged: true, rowIndex: 1, controlIndex: 0 }, rowSections, 3)).toEqual({
      engaged: true,
      rowIndex: 2,
      controlIndex: 0,
    });
    expect(jumpToNextSection(initialFocusState(), [0, 0], 0)).toBeNull();
    expect(jumpToNextSection(initialFocusState(), [-1, -1], 1)).toBeNull();
  });
}
