import { expect, jest } from "@jest/globals";
import { TypeMorph } from "../src/typemorph.js";
import { assertNoMemoryLeaks } from "./common.js";

describe("TypeMorph - ChunkSize", () => {
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

  test("should type characters in chunks", async () => {
    const chunkSize = 3;
    const text = "Hello World!";
    typer = new TypeMorph({ parent, chunkSize, speed: 10, showCursor: false });

    typer.type(text);

    await jest.advanceTimersByTimeAsync(10);
    expect(parent.textContent.length).toBe(chunkSize * 2);

    await jest.runAllTimersAsync();

    expect(parent.textContent).toBe(text);
  });

  test("should handle chunkSize larger than text length", async () => {
    typer = new TypeMorph({ parent, chunkSize: 50, speed: 10 });
    typer.type("Hi");
    await jest.runAllTimersAsync();
    expect(parent.textContent).toBe("Hi");
  });

  test("should batch DOM updates according to chunkSize", async () => {
    const speed = 10;
    const chunkSize = 5;
    const text = "A".repeat(25);

    const typer = new TypeMorph({
      parent,
      speed,
      chunkSize,
      showCursor: false,
    });

    typer.type(text);

    const textProgress = [];

    for (let i = 0; i < 5; i++) {
      textProgress.push(parent.textContent.length);
      await jest.advanceTimersByTimeAsync(speed);
    }

    await jest.runAllTimersAsync();

    expect(parent.textContent).toBe(text);

    for (let i = 2; i < textProgress.length; i++) {
      const diff = textProgress[i] - textProgress[i - 1];
      expect(diff).toBeGreaterThanOrEqual(chunkSize - 1);
      expect(diff).toBeLessThanOrEqual(chunkSize + 1);
    }

    typer.destroy();
  });

  test("should backspace characters in chunks", async () => {
    const chunkSize = 3;
    const speed = 10;
    const text = "12345";
    typer = new TypeMorph({
      parent,
      chunkSize,
      speed,
      loopCount: 2,
      loopType: "backspace",
      loopStartDelay: 0,
      loopEndDelay: 0,
      showCursor: false,
    });

    typer.loop(text);

    await jest.advanceTimersByTimeAsync(speed * 3);
    expect(parent.textContent.length).toBe(2);

    await jest.runAllTimersAsync();
    expect(parent.textContent).toBe(text);
  });

  test("should type correctly when text length is a multiple of chunkSize", async () => {
    const text = "1234567890";
    typer = new TypeMorph({
      parent,
      chunkSize: 5,
      speed: 10,
    });

    typer.type(text);
    await jest.runAllTimersAsync();

    expect(parent.textContent).toBe(text);
  });
});
