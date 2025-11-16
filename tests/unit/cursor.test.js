import { expect, jest } from "@jest/globals";
import TypeMorph from "../../src/typemorph.js";

describe("TypeMorph - Cursor", () => {
  let parent;
  let typer;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, "setTimeout");
    document.body.innerHTML = '<div id="target"></div>';
    parent = document.getElementById("target");
  });

  afterEach(() => {
    if (typer && !typer.isDestroyed()) {
      typer.destroy();
    }
    jest.useRealTimers();
  });

  test("should create a cursor element when showCursor=true", async () => {
    typer = new TypeMorph({
      parent,
      showCursor: true,
      speed: 1,
    });

    typer.type("Hello");
    await jest.advanceTimersByTimeAsync(1);

    const cursor = parent.querySelector(".typemorph-cursor");
    expect(cursor).not.toBeNull();
    expect(cursor.textContent.trim()).toBe("|");
  });

  test("should handle custom cursor character properly", async () => {
    typer = new TypeMorph({
      parent,
      showCursor: true,
      cursorChar: "_",
      hideCursorOnFinishTyping: false,
    });

    typer.type("Hello");
    await jest.runAllTimersAsync();

    const cursor = parent.querySelector(".typemorph-cursor");
    expect(cursor).not.toBeNull();
    expect(cursor.textContent.trim()).toBe("_");
  });

  test("should not create cursor when showCursor=false", async () => {
    typer = new TypeMorph({
      parent,
      showCursor: false,
    });

    typer.type("Hello");
    await jest.runAllTimersAsync();

    const cursor = parent.querySelector(".typemorph-cursor");
    expect(cursor).toBeNull();
  });

  test("should remove cursor when destroy() is called", async () => {
    typer = new TypeMorph({
      parent,
      showCursor: true,
      hideCursorOnFinishTyping: false,
    });

    typer.type("Hi");
    await jest.runAllTimersAsync();

    expect(parent.querySelector(".typemorph-cursor")).not.toBeNull();

    typer.destroy();

    expect(parent.querySelector(".typemorph-cursor")).toBeNull();
  });

  test("should blink cursor via CSS animation (unless user customizes this)", async () => {
    typer = new TypeMorph({
      parent,
      showCursor: true,
      hideCursorOnFinishTyping: false,
    });

    typer.type("Blink");
    await jest.runAllTimersAsync();

    const cursor = parent.querySelector(".typemorph-cursor");
    expect(cursor).not.toBeNull();

    const animation =
      cursor.style.animation || window.getComputedStyle(cursor).animation;
    expect(animation).toMatch(/blink/i);
  });

  test("should not duplicate cursor on multiple type() calls", async () => {
    typer = new TypeMorph({
      parent,
      showCursor: true,
      hideCursorOnFinishTyping: false,
    });

    typer.type("One");
    await jest.runAllTimersAsync();

    typer.type("Two");
    await jest.runAllTimersAsync();

    const cursors = parent.querySelectorAll(".typemorph-cursor");
    expect(cursors.length).toBe(1);
  });

  test("should remove cursor after stop() is called", async () => {
    typer = new TypeMorph({
      parent,
      showCursor: true,
      speed: 10,
      hideCursorOnFinishTyping: true,
    });

    typer.type("This will stop");
    await jest.advanceTimersByTimeAsync(30);
    typer.stop();
    await jest.runAllTimersAsync();

    const cursor = parent.querySelector(".typemorph-cursor");
    expect(cursor).toBeNull();
  });

  test("should respect cursor placement in HTML during backspacing", async () => {
    typer = new TypeMorph({
      parent,
      showCursor: true,
      loopCount: 2,
      speed: 1,
      backspaceSpeed: 1,
      loopType: "backspace",
      loopEndDelay: 0,
      loopStartDelay: 0,
      hideCursorOnFinishTyping: true,
    });

    const totalChars = 25;
    const html = "<b>12345</b><button>12345</button><i>12345</i><u>12345</u>";
    typer.loop(html);

    await jest.advanceTimersByTimeAsync(totalChars + totalChars / 2);
    expect(parent.querySelector(".typemorph-cursor")).not.toBeNull();

    await jest.advanceTimersByTimeAsync(totalChars / 4);
    expect(parent.querySelector(".typemorph-cursor")).not.toBeNull();

    await jest.runAllTimersAsync();
    expect(parent.querySelector(".typemorph-cursor")).toBeNull();
  });
});
