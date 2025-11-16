import { expect, jest } from "@jest/globals";
import TypeMorph from "../../src/typemorph.js";

describe("TypeMorph - Temporary Config Overrides", () => {
  let parent;
  let typer;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, "setTimeout");
    document.body.innerHTML = '<div id="target"></div>';
    parent = document.getElementById("target");

    typer = new TypeMorph({
      parent,
      speed: 100,
      chunkSize: 2,
      loopCount: 3,
      loopType: "clear",
      loopFinalBehavior: "keep",
      loopStartDelay: 200,
      loopEndDelay: 400,
      backspaceSpeed: 100,
      showCursor: true,
      cursorChar: "|",
      parseMarkdown: false,
      markdownInline: false,
      parseHtml: true,
      hideCursorOnFinishTyping: true,
      autoScroll: false,
      scrollInterval: 5,
      clearBeforeTyping: true,
    });
  });

  afterEach(() => {
    if (typer && !typer.isDestroyed()) typer.destroy();
    jest.useRealTimers();
  });

  test("should override speed temporarily", async () => {
    const text = "12345";
    typer.type(text);
    await jest.advanceTimersByTimeAsync(100 * 5);
    expect(parent.textContent).toBe(text);

    typer.type(text, { speed: 1 });
    await jest.runAllTimersAsync(5);
    expect(parent.textContent).toBe(text);
    expect(typer.config.speed).toBe(100);
  });

  test("should override chunkSize per operation", async () => {
    typer.type("Hello World", null, { chunkSize: 5 });
    await jest.runAllTimersAsync();

    expect(parent.textContent).toBe("Hello World");
    expect(typer.config.chunkSize).toBe(2);
  });

  test("should override loopCount and stop after specified loops", async () => {
    typer.loop("Loop", null, { loopCount: 2 });
    await jest.runAllTimersAsync();

    expect(typer.getCurrentLoop()).toBe(2);
    expect(typer.config.loopCount).toBe(3);
  });

  test("should override loopType temporarily", async () => {
    typer.loop("12345", null, {
      loopType: "backspace",
      loopCount: 2,
      speed: 1,
      loopEndDelay: 0,
      loopStartDelay: 0,
      chunkSize: 1,
      showCursor: false,
    });
    await jest.advanceTimersByTimeAsync(7);

    expect(parent.textContent.length).toBe(3);
    expect(typer.config.loopType).toBe("clear");
  });

  test("should apply loopFinalBehavior only for this operation", async () => {
    typer.loop("FinalKeep", null, {
      loopCount: 1,
      loopFinalBehavior: "remove",
    });
    await jest.runAllTimersAsync();

    expect(parent.textContent).toBe("");
    expect(typer.config.loopFinalBehavior).toBe("keep");
  });

  test("should override delays (loopStartDelay and loopEndDelay)", async () => {
    typer.loop("1", null, {
      speed: 1,
      loopCount: 2,
      loopStartDelay: 1,
      loopEndDelay: 500,
      showCursor: false,
    });

    await jest.advanceTimersByTimeAsync(500);
    expect(parent.textContent).toBe("1");

    await jest.advanceTimersByTimeAsync(1);
    expect(parent.textContent).toBe("");
  });

  test("should override parseMarkdown per operation", async () => {
    const text = "**Bold** Text";
    typer.type(text, null, { parseMarkdown: true });
    await jest.runAllTimersAsync();

    expect(parent.innerHTML).toContain("<strong>");
    expect(typer.config.parseMarkdown).toBe(false);
  });

  test("should override markdownInline behavior temporarily", async () => {
    typer.type("*Italic*", null, { parseMarkdown: true, markdownInline: true });
    await jest.runAllTimersAsync();
    expect(parent.innerHTML.trim().startsWith("<p>")).toBe(false);
  });

  test("should override parseHtml and escape HTML", async () => {
    const htmlText = "<b>Unsafe</b>";
    typer.type(htmlText, null, { parseHtml: false });
    await jest.runAllTimersAsync();
    expect(parent.textContent).toContain(htmlText);
  });

  test("should override cursor visibility per operation", async () => {
    typer.type("No cursor", null, { showCursor: false });
    await jest.runAllTimersAsync();

    const cursor = parent.querySelector(".typemorph-cursor");
    expect(cursor).toBeNull();
    expect(typer.config.showCursor).toBe(true);
  });

  test("should override cursor character temporarily", async () => {
    typer.type("Cursor", null, {
      cursorChar: "_",
      hideCursorOnFinishTyping: false,
    });
    await jest.runAllTimersAsync();

    const cursor = parent.querySelector(".typemorph-cursor");
    expect(cursor.textContent).toBe("_");
    expect(typer.config.cursorChar).toBe("|");
  });

  test("should override clearBeforeTyping per operation", async () => {
    typer.type("First");
    await jest.runAllTimersAsync();

    typer.type("Second", null, { clearBeforeTyping: false });
    await jest.runAllTimersAsync();

    expect(parent.textContent).toContain("FirstSecond");
    expect(typer.config.clearBeforeTyping).toBe(true);
  });
});
