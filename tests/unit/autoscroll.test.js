import { jest } from "@jest/globals";
import TypeMorph from "../../src/typemorph.js";

describe("TypeMorph - Auto-Scroll", () => {
  let typer;
  let parent;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, "setTimeout");
    document.body.innerHTML = '<div id="target"></div>';
    parent = document.getElementById("target");

    parent.style.height = "100px";
    parent.style.overflow = "auto";

    typer = new TypeMorph({
      parent,
      autoScroll: true,
      speed: 1,
      showCursor: false,
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
    expect(parent.scrollTop + parent.clientHeight).toBeCloseTo(
      parent.scrollHeight,
      0
    );
  });

  // test("should not auto-scroll when autoScroll=false", async () => {
  //   parent.style.height = "100px";
  //   parent.style.overflow = "auto";

  //   typer = new TypeMorph({
  //     parent,
  //     showCursor: false,
  //     speed: 1,
  //     autoScroll: false,
  //   });

  //   const longText = "A".repeat(200);
  //   typer.type(longText);
  //   await jest.runAllTimersAsync();

  //   // Should remain at top
  //   expect(parent.scrollTop).toBe(0);
  // });

  // test("should respect scrollInterval for scroll throttling", async () => {
  //   parent.style.height = "100px";
  //   parent.style.overflow = "auto";

  //   const scrollSpy = jest.spyOn(parent, "scrollTo");

  //   typer = new TypeMorph({
  //     parent,
  //     showCursor: false,
  //     speed: 1,
  //     autoScroll: true,
  //     scrollInterval: 10,
  //   });

  //   const text = "A".repeat(50);
  //   typer.type(text);
  //   await jest.runAllTimersAsync();

  //   // Should scroll ~5 times (50 chars / 10 interval)
  //   expect(scrollSpy).toHaveBeenCalled();
  //   expect(scrollSpy.mock.calls.length).toBeLessThan(50);
  //   expect(scrollSpy.mock.calls.length).toBeGreaterThan(3);

  //   scrollSpy.mockRestore();
  // });

  // test("should stop auto-scrolling when user scrolls up", async () => {
  //   parent.style.height = "100px";
  //   parent.style.overflow = "auto";

  //   typer = new TypeMorph({
  //     parent,
  //     showCursor: false,
  //     speed: 1,
  //     autoScroll: true,
  //   });

  //   const longText = "A".repeat(200);
  //   typer.type(longText);

  //   // Let some typing happen
  //   await jest.advanceTimersByTimeAsync(50);

  //   // User scrolls up
  //   parent.scrollTop = 0;
  //   parent.dispatchEvent(new Event("scroll"));

  //   // Continue typing
  //   await jest.runAllTimersAsync();

  //   // Should stay at top (user scrolled)
  //   expect(parent.scrollTop).toBe(0);
  // });

  // test("should resume auto-scrolling when user scrolls back to bottom", async () => {
  //   parent.style.height = "100px";
  //   parent.style.overflow = "auto";

  //   typer = new TypeMorph({
  //     parent,
  //     showCursor: false,
  //     speed: 1,
  //     autoScroll: true,
  //   });

  //   const longText = "A".repeat(200);
  //   typer.type(longText);

  //   await jest.advanceTimersByTimeAsync(50);

  //   // User scrolls up
  //   parent.scrollTop = 0;
  //   parent.dispatchEvent(new Event("scroll"));

  //   await jest.advanceTimersByTimeAsync(20);

  //   // User scrolls back to bottom
  //   parent.scrollTop = parent.scrollHeight - parent.clientHeight;
  //   parent.dispatchEvent(new Event("scroll"));

  //   await jest.runAllTimersAsync();

  //   // Should be at bottom again
  //   expect(parent.scrollTop + parent.clientHeight).toBeCloseTo(
  //     parent.scrollHeight,
  //     0
  //   );
  // });

  // test("should auto-scroll during backspacing", async () => {
  //   parent.style.height = "100px";
  //   parent.style.overflow = "auto";

  //   typer = new TypeMorph({
  //     parent,
  //     showCursor: false,
  //     speed: 1,
  //     backspaceSpeed: 1,
  //     autoScroll: true,
  //     loopCount: 2,
  //     loopType: "backspace",
  //   });

  //   const longText = "A".repeat(200);
  //   typer.loop(longText);

  //   await jest.runAllTimersAsync();

  //   // Should scroll during both typing and backspacing
  //   expect(parent.scrollTop + parent.clientHeight).toBeCloseTo(
  //     parent.scrollHeight,
  //     0
  //   );
  // });

  // test("should not scroll if content doesn't overflow", async () => {
  //   parent.style.height = "500px";
  //   parent.style.overflow = "auto";

  //   const scrollSpy = jest.spyOn(parent, "scrollTo");

  //   typer = new TypeMorph({
  //     parent,
  //     showCursor: false,
  //     speed: 1,
  //     autoScroll: true,
  //   });

  //   typer.type("Short text");
  //   await jest.runAllTimersAsync();

  //   // No scrolling needed - content fits
  //   expect(scrollSpy).not.toHaveBeenCalled();
  //   expect(parent.scrollTop).toBe(0);

  //   scrollSpy.mockRestore();
  // });

  // test("should cleanup scroll listener on destroy", async () => {
  //   parent.style.height = "100px";
  //   parent.style.overflow = "auto";

  //   typer = new TypeMorph({
  //     parent,
  //     showCursor: false,
  //     speed: 1,
  //     autoScroll: true,
  //   });

  //   const longText = "A".repeat(200);
  //   typer.type(longText);
  //   await jest.advanceTimersByTimeAsync(50);

  //   expect(typer._scrollListener).not.toBeNull();

  //   typer.destroy();

  //   expect(typer._scrollListener).toBeNull();
  // });
});
