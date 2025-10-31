import { TypeMorph } from "../src/typemorph.js";

jest.useFakeTimers();

describe("TypeMorph Core API", () => {
  let typer;
  let parent;

  beforeEach(() => {
    document.body.innerHTML = '<div id="target"></div>';
    parent = document.getElementById("target");

    typer = new TypeMorph({
      parent,
      speed: 10,
      clearBeforeTyping: true,
      hideCursorOnFinishTyping: true,
      loopCount: 2,
      debug: false,
    });
  });

  afterEach(() => {
    if (!typer.isDestroyed()) typer.destroy();
    jest.clearAllTimers();
  });

  test("type() should insert text into parent", async () => {
    const typingPromise = typer.type("Hello World");

    jest.runAllTimers();

    await typingPromise;
    expect(parent.textContent).toContain("Hello World");
  });

  test("clearBeforeTyping should wipe old content", async () => {
    parent.textContent = "Old";
    const promise = typer.type("New");
    jest.runAllTimers();
    await promise;
    expect(parent.textContent).toBe("New");
  });

  test("loop() should run the text multiple times", async () => {
    const promise = typer.loop("Hi");
    jest.runAllTimers();
    await promise;
    expect(typer.getCurrentLoop()).toBe(typer.config.loopCount);
  });

  test("stop() should abort typing and remove cursor", async () => {
    const promise = typer.type("This will stop");
    await typer.stop();
    jest.runAllTimers();
    await promise.catch(() => {});
    expect(typer.isTyping()).toBe(false);
    expect(parent.querySelector("[data-typemorph-cursor]")).toBeNull();
  });

  test("destroy() should clean up DOM and mark destroyed", async () => {
    const promise = typer.type("Hello");
    jest.runAllTimers();
    await promise;
    typer.destroy();
    expect(typer.isDestroyed()).toBe(true);
    expect(parent.querySelector("[data-typemorph-cursor]")).toBeNull();
  });

  test("should respect parseHTML flag", async () => {
    typer.config.parseHTML = true;
    const promise = typer.type("<b>Bold</b>");
    jest.runAllTimers();
    await promise;
    expect(parent.querySelector("b")).not.toBeNull();
  });

  test("should throw error if parent is invalid", () => {
    expect(() => new TypeMorph({ parent: "no-such-id" })).toThrow();
  });
});
