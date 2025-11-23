import { expect, jest } from "@jest/globals";
import TypeMorph from "../../src/typemorph.js";

describe("TypeMorph - Auto-Scroll", () => {
  let typer;
  let parent;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, "setTimeout");
    document.body.innerHTML = '<div id="target"></div>';
    parent = document.getElementById("target");

    typer = new TypeMorph({
      parent,
      autoScroll: true,
      speed: 1,
      showCursor: false,
    });

    parent.scrollTo = jest.fn((options) => {
      if (typeof options === "object" && options.top !== undefined) {
        parent.scrollTop = options.top;
      }
    });

    Object.defineProperties(parent, {
      scrollHeight: {
        get: () => 500,
        configurable: true,
      },
      clientHeight: {
        get: () => 100,
        configurable: true,
      },
    });
  });

  afterEach(() => {
    if (typer && !typer.isDestroyed()) {
      typer.destroy();
    }
    jest.useRealTimers();
  });

  test("should autoscroll when autoScroll=true", async () => {
    const longText = "A".repeat(200);
    typer.type(longText);
    await jest.runAllTimersAsync();

    expect(parent.scrollTop).toBeGreaterThan(0);
    expect(parent.scrollTop).toBeCloseTo(
      parent.scrollHeight - parent.clientHeight,
      0
    );
  });

  test("should not autoscroll when autoScroll=false", async () => {
    typer = new TypeMorph({
      parent,
      showCursor: false,
      speed: 1,
      autoScroll: false,
    });

    const longText = "A".repeat(200);
    typer.type(longText);
    await jest.runAllTimersAsync();

    expect(parent.scrollTop).toBe(0);
  });

  test("should respect scrollInterval for scroll throttling", async () => {
    const scrollSpy = jest.spyOn(parent, "scrollTo");

    typer = new TypeMorph({
      parent,
      showCursor: false,
      speed: 1,
      autoScroll: true,
      scrollInterval: 10,
    });

    const text = "A".repeat(50);
    typer.type(text);
    await jest.runAllTimersAsync();

    expect(scrollSpy).toHaveBeenCalled();
    expect(scrollSpy.mock.calls.length).toBeLessThan(50);
    expect(scrollSpy.mock.calls.length).toBeGreaterThan(3);

    scrollSpy.mockRestore();
  });

  test("should stop auto scrolling when user scrolls up", async () => {
    const longText = "A".repeat(200);
    typer.type(longText);

    await jest.advanceTimersByTimeAsync(50);

    parent.scrollTop = 0;
    parent.dispatchEvent(new Event("scroll"));

    await jest.runAllTimersAsync();

    expect(parent.scrollTop).toBe(0);
  });

  test("should resume auto-scrolling when user scrolls back to bottom", async () => {
    const longText = "A".repeat(200);
    typer.type(longText);

    await jest.advanceTimersByTimeAsync(50);

    parent.scrollTop = 0;
    parent.dispatchEvent(new Event("scroll"));

    await jest.advanceTimersByTimeAsync(20);

    parent.scrollTop = parent.scrollHeight - parent.clientHeight;
    parent.dispatchEvent(new Event("scroll"));

    await jest.runAllTimersAsync();

    expect(parent.scrollTop).toBeCloseTo(
      parent.scrollHeight - parent.clientHeight,
      0
    );
  });

  test("should auto-scroll during backspacing", async () => {
    const scrollSpy = jest.spyOn(parent, "scrollTo");

    typer = new TypeMorph({
      parent,
      showCursor: false,
      speed: 1,
      backspaceSpeed: 1,
      autoScroll: true,
      loopCount: 2,
      loopType: "backspace",
      loopEndDelay: 0,
      loopStartDelay: 0,
      scrollInterval: 50,
    });

    const longText = "A".repeat(100);
    typer.loop(longText);

    await jest.advanceTimersByTimeAsync(250);
    expect(scrollSpy.mock.calls.length).toBeGreaterThanOrEqual(3);

    await jest.runAllTimersAsync();

    expect(parent.scrollTop + parent.clientHeight).toBeCloseTo(
      parent.scrollHeight,
      0
    );

    scrollSpy.mockRestore();
  });

  test("should not scroll if content doesn't overflow", async () => {
    Object.defineProperties(parent, {
      clientHeight: {
        get: () => 500,
        configurable: true,
      },
    });

    const scrollSpy = jest.spyOn(parent, "scrollTo");

    typer = new TypeMorph({
      parent,
      showCursor: false,
      speed: 1,
      autoScroll: true,
    });

    typer.type("Short text");
    await jest.runAllTimersAsync();

    expect(scrollSpy).not.toHaveBeenCalled();
    expect(parent.scrollTop).toBe(0);

    scrollSpy.mockRestore();
  });
});
