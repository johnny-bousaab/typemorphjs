export const CURSOR_SELECTOR = "[data-typemorph-cursor]";

export function assertNoMemoryLeaks(typer, cursorNotExpected = true) {
  expect(typer._activeTimers.size).toBe(0);
  expect(typer._activeIntervals.size).toBe(0);
  expect(typer._abortController).toBeNull();

  if (typer._operationQueue) {
    expect(Promise.resolve(typer._operationQueue)).resolves.toBeUndefined();
  }
  if (cursorNotExpected) expect(typer._cursorEl).toBeNull();
}
