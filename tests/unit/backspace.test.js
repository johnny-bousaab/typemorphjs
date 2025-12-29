import { jest } from "@jest/globals";
import TypeMorph from "../../src/typemorph.js";
import { assertNoMemoryLeaks } from "../common.js";

describe("TypeMorph - Backspace", () => {
  let typer;
  let parent;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, "setTimeout");
    document.body.innerHTML = '<div id="target"></div>';
    parent = document.getElementById("target");

    typer = new TypeMorph({
      parent,
      clearBeforeTyping: false,
      showCursor: false,
      speed: 10,
      backspaceSpeed: 10,
    });
  });

  afterEach(() => {
    if (typer && !typer.isDestroyed()) {
      typer.destroy();
    }
    jest.useRealTimers();
  });

  test("should backspace a specific number of characters", async () => {
    typer.type("Hello World");
    await jest.runAllTimersAsync();

    typer.backspace(5);
    await jest.runAllTimersAsync();

    expect(parent.textContent).toBe("Hello ");
    assertNoMemoryLeaks(typer);
  });

  test("should backspace entire content when count exceeds length", async () => {
    typer.type("Hello");
    await jest.runAllTimersAsync();

    typer.backspace(100);
    await jest.runAllTimersAsync();

    expect(parent.textContent).toBe("");
    assertNoMemoryLeaks(typer);
  });

  test("should do nothing when backspacing zero characters", async () => {
    typer.type("Hello");
    await jest.runAllTimersAsync();

    typer.backspace(0);
    await jest.runAllTimersAsync();

    expect(parent.textContent).toBe("Hello");
    assertNoMemoryLeaks(typer);
  });

  test("should handle backspace on empty content safely", async () => {
    typer.backspace(5);
    await jest.runAllTimersAsync();

    expect(parent.textContent).toBe("");
    assertNoMemoryLeaks(typer);
  });

  test("should backspace correctly with an HTML element", async () => {
    typer.type("<button>12345</button>", parent, {
      parseHtml: true,
    });

    await jest.runAllTimersAsync();

    typer.backspace(2);

    await jest.runAllTimersAsync();

    expect(parent.innerHTML).toBe("<button>123</button>");

    assertNoMemoryLeaks(typer);
  });

  test("should backspace correctly across multiple HTML elements", async () => {
    typer.type("<button>12345</button><button>12345</button>", parent, {
      parseHtml: true,
    });

    await jest.runAllTimersAsync();

    typer.backspace(6);

    await jest.runAllTimersAsync();

    expect(parent.innerHTML).toBe("<button>1234</button>");

    assertNoMemoryLeaks(typer);
  });

  test("should backspace and remove empty HTML elements", async () => {
    typer.type("<strong>12345</strong>", parent, {
      parseHtml: true,
    });

    await jest.runAllTimersAsync();

    typer.backspace(5);
    await jest.runAllTimersAsync();

    expect(parent.innerHTML).toBe("");
  });

  test("should not remove partial HTML structure incorrectly", async () => {
    typer.type("<span>Hello</span>", parent, { parseHtml: true });
    await jest.runAllTimersAsync();

    typer.backspace(2);
    await jest.runAllTimersAsync();

    expect(parent.textContent).toBe("Hel");
    expect(parent.querySelector("span")).toBeTruthy();

    typer.type("lo", parent, { parseHtml: true });
    await jest.runAllTimersAsync();

    expect(parent.innerHTML).toBe("<span>Hel</span>lo");
  });

  test("should backspace correctly across inner HTML elements", async () => {
    typer.type("<button>12345<span>12345</span></button>", parent, {
      parseHtml: true,
    });

    await jest.runAllTimersAsync();

    typer.backspace(4);

    await jest.runAllTimersAsync();

    expect(parent.innerHTML).toBe("<button>12345<span>1</span></button>");
  });

  test("should backspace correctly across inner HTML elements, removing one of them if empty", async () => {
    typer.type("<button>12345<span>12345</span></button>", parent, {
      parseHtml: true,
    });

    await jest.runAllTimersAsync();

    typer.backspace(5);

    await jest.runAllTimersAsync();

    expect(parent.innerHTML).toBe("<button>12345</button>");
  });

  test("should set isTyping true during backspace and false after", async () => {
    typer.type("Hello");
    await jest.runAllTimersAsync();

    typer.backspace(2);

    await jest.advanceTimersByTimeAsync(1);

    expect(typer.isTyping()).toBe(true);

    await jest.runAllTimersAsync();

    expect(typer.isTyping()).toBe(false);
    assertNoMemoryLeaks(typer);
  });

  test("should call onFinish when backspace completes naturally", async () => {
    const onFinish = jest.fn();

    typer.destroy();
    typer = new TypeMorph({
      parent,
      clearBeforeTyping: false,
      onFinish,
    });

    typer.type("Hello");
    await jest.runAllTimersAsync();

    typer.backspace(3);
    await jest.runAllTimersAsync();

    expect(onFinish).toHaveBeenCalledTimes(2);
    assertNoMemoryLeaks(typer);
  });

  test("should call onStop when backspace is interrupted", async () => {
    const onStop = jest.fn();

    typer.destroy();
    typer = new TypeMorph({
      parent,
      clearBeforeTyping: false,
      onStop,
    });

    typer.type("Hello World");
    await jest.runAllTimersAsync();

    typer.backspace(10);
    await jest.advanceTimersByTimeAsync(10);
    typer.stop();

    await jest.runAllTimersAsync();

    expect(onStop).toHaveBeenCalledTimes(1);
    assertNoMemoryLeaks(typer);
  });

  test("should stop backspacing immediately when stop() is called", async () => {
    const text = "Hello World";
    typer.type(text);
    await jest.runAllTimersAsync();

    typer.backspace();
    await jest.advanceTimersByTimeAsync(30);
    typer.stop();

    await jest.runAllTimersAsync();

    expect(parent.textContent.length).toBeLessThan(text.length);
    expect(parent.textContent.length).toBeGreaterThan(0);

    assertNoMemoryLeaks(typer);
  });
});
