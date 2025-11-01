import { jest } from "@jest/globals";
import { TypeMorph } from "../../src/typemorph.js";

jest.useFakeTimers();

describe("TypeMorph - Core Basics", () => {
  let typer;
  let parent;

  beforeEach(() => {
    document.body.innerHTML = '<div id="target"></div>';
    parent = document.getElementById("target");
    typer = new TypeMorph({
      parent,
      speed: 10,
      backspaceSpeed: 10,
      clearBeforeTyping: true,
      hideCursorOnFinishTyping: true,
      loopCount: 2,
      debug: false,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    if (!typer.isDestroyed()) typer.destroy();
  });

  // test("type() should type text into the parent element", async () => {
  //   const promise = typer.type("Hello World");
  //   jest.runAllTimers();
  //   await promise;

  //   expect(parent.textContent).toBe("Hello World");
  //   expect(typer.isTyping()).toBe(false);
  // });

  test("type() should type text into the parent element", async () => {
    console.log("=== Starting test ===");

    const promise = typer.type("Hello World");
    console.log("Promise created, isTyping:", typer.isTyping());

    jest.runAllTimers();
    console.log("Timers run, timer count:", jest.getTimerCount());
    console.log("isTyping:", typer.isTyping());

    await promise;
    console.log("Promise resolved");

    expect(parent.textContent).toBe("Hello World");
    expect(typer.isTyping()).toBe(false);
  });

  // test("clearBeforeTyping should remove old content before typing", async () => {
  //   parent.textContent = "Old text";
  //   const promise = typer.type("New text");
  //   jest.runAllTimers();
  //   await promise;

  //   expect(parent.textContent).toBe("New text");
  // });

  // test("loop() should type and backspace for given loopCount", async () => {
  //   const promise = typer.loop("Hi");
  //   jest.runAllTimers();
  //   await promise;

  //   expect(typer.getCurrentLoop()).toBe(typer.config.loopCount);
  //   expect(typer.isTyping()).toBe(false);
  // });

  // test("stop() should abort current typing and remove cursor", async () => {
  //   const promise = typer.type("This text should stop early");

  //   await typer.stop();
  //   jest.runAllTimers();

  //   await promise.catch(() => {});

  //   expect(typer.isTyping()).toBe(false);
  //   expect(parent.querySelector("[data-typemorph-cursor]")).toBeNull();
  // });

  // test("destroy() should remove cursor and mark instance destroyed", async () => {
  //   const promise = typer.type("Bye");
  //   jest.runAllTimers();
  //   await promise;

  //   typer.destroy();

  //   expect(typer.isDestroyed()).toBe(true);
  //   expect(parent.querySelector("[data-typemorph-cursor]")).toBeNull();

  //   await expect(() => typer.type("destroyed instance")).rejects.toThrow();
  //   await expect(() => typer.stop()).rejects.toThrow("destroyed instance");
  //   await expect(() => typer.loop("Hello")).rejects.toThrow(
  //     "destroyed instance"
  //   );
  // });

  // test("should show and hide cursor based on config", async () => {
  //   typer.config.showCursor = true;
  //   typer.config.hideCursorOnFinishTyping = false;

  //   const promise = typer.type("Cursor test");
  //   jest.runAllTimers();
  //   await promise;

  //   const cursor = parent.querySelector("[data-typemorph-cursor]");
  //   expect(cursor).not.toBeNull();
  //   expect(cursor.textContent).toBe(typer.cursorChar);
  // });

  // test("should throw if parent element not found", () => {
  //   expect(() => new TypeMorph({ parent: "nonexistent-id" })).toThrow(
  //     "Parent element not found"
  //   );
  // });

  // test("should throw if type() called with invalid text", async () => {
  //   await expect(typer.type(null)).rejects.toThrow("valid text string");
  // });
});
