import { jest } from "@jest/globals";
import { TypeMorph } from "../../src/typemorph.js";

const SPEED = 10;
const BACKSPACING_SPEED = 10;

describe("TypeMorph - Core Basics", () => {
  let typer;
  let parent;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, "setTimeout");
    document.body.innerHTML = '<div id="target"></div>';
    parent = document.getElementById("target");
    typer = new TypeMorph({
      parent,
      speed: SPEED,
      backspaceSpeed: BACKSPACING_SPEED,
      clearBeforeTyping: true,
      hideCursorOnFinishTyping: true,
      showCursor: false,
      loopCount: 2,
      debug: false,
    });
  });

  afterEach(() => {
    if (typer && !typer.isDestroyed()) {
      typer.destroy();
    }
    jest.useRealTimers();
  });

  // type() TESTS

  describe("type()", () => {
    test("should type text into the parent element", async () => {
      const promise = typer.type("Hello World");

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe("Hello World");
      expect(typer.isTyping()).toBe(false);
    });

    test("isTyping() should be true during typing operation", async () => {
      const promise = typer.type("Hello World");

      await jest.advanceTimersByTimeAsync(SPEED * 2);

      expect(typer.isTyping()).toBe(true);
      expect(parent.textContent.length).toBeGreaterThan(0);

      await jest.runAllTimersAsync();
      await promise;

      expect(typer.isTyping()).toBe(false);
      expect(parent.textContent).toBe("Hello World");
    });

    test("should handle empty string gracefully", async () => {
      parent.textContent = "Existing content";

      const promise = typer.type("");
      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe("");
      expect(typer.isTyping()).toBe(false);
    });

    test("should reject on null text", async () => {
      await expect(typer.type(null)).rejects.toThrow();
    });

    test("should reject on undefined text", async () => {
      await expect(typer.type(undefined)).rejects.toThrow();
    });

    test("should reject on non-string text", async () => {
      await expect(typer.type(123)).rejects.toThrow();
      await expect(typer.type({})).rejects.toThrow();
      await expect(typer.type([])).rejects.toThrow();
    });

    test("should handle single character", async () => {
      const promise = typer.type("A");

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe("A");
    });

    test("should handle long text", async () => {
      const longText = "A".repeat(50);
      const promise = typer.type(longText);

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe(longText);
    });

    test("should handle text with newlines", async () => {
      const promise = typer.type("Line 1\nLine 2\nLine 3");

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe("Line 1\nLine 2\nLine 3");
    });

    test("should handle special characters", async () => {
      const promise = typer.type("Hello! @#$% ^&*() {}[]");

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe("Hello! @#$% ^&*() {}[]");
    });

    test("should handle unicode and emoji", async () => {
      const promise = typer.type("Hello 👋 World 🌍");

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe("Hello 👋 World 🌍");
    });

    test("should handle multi-byte characters (CJK)", async () => {
      const promise = typer.type("日本語テスト");

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe("日本語テスト");
    });

    test("should type to different parent when specified", async () => {
      const otherParent = document.createElement("div");
      document.body.appendChild(otherParent);

      const promise = typer.type("Other text", otherParent);

      await jest.runAllTimersAsync();
      await promise;

      expect(otherParent.textContent).toBe("Other text");
      expect(parent.textContent).toBe("");

      otherParent.remove();
    });

    test("should type to parent by selector", async () => {
      const otherParent = document.createElement("div");
      otherParent.id = "other-target";
      document.body.appendChild(otherParent);

      const promise = typer.type("Selector text", "other-target");

      await jest.runAllTimersAsync();
      await promise;

      expect(otherParent.textContent).toBe("Selector text");

      otherParent.remove();
    });

    test("should clear before typing when clearBeforeTyping is true", async () => {
      parent.textContent = "Existing content";

      const promise = typer.type("New content");

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe("New content");
    });

    test("should not clear before typing when clearBeforeTyping is false", async () => {
      typer.destroy();
      typer = new TypeMorph({
        parent,
        clearBeforeTyping: false,
        showCursor: false,
      });

      parent.textContent = "Existing ";

      const promise = typer.type("content");

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe("Existing content");
    });

    test("should handle rapid consecutive type() calls", async () => {
      typer.type("First");
      typer.type("Second");
      const promise = typer.type("Third");

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe("Third");
    });

    test("should cancel previous type() when new type() is called", async () => {
      const promise1 = typer.type("This will be cancelled");

      jest.advanceTimersByTime(50);
      await Promise.resolve();

      const promise2 = typer.type("Final text");

      await jest.runAllTimersAsync();
      await promise2;

      expect(parent.textContent).toBe("Final text");
      expect(parent.textContent).not.toContain("cancelled");
    });

    test("should return a promise that resolves when typing completes", async () => {
      const promise = typer.type("Test");

      expect(promise).toBeInstanceOf(Promise);

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe("Test");
    });

    test("should throw when called on destroyed instance", async () => {
      typer.destroy();

      await expect(() => typer.type("Test")).rejects.toThrow();
    });
  });

  // loop() TESTS

  describe("loop()", () => {
    test("should loop text specified number of times", async () => {
      typer = new TypeMorph({
        parent,
        speed: 10,
        backspaceSpeed: 10,
        loopCount: 2,
        loopType: "backspace",
        showCursor: false,
      });

      const promise = typer.loop("Test");

      await jest.runAllTimersAsync();
      await promise;

      expect(typer.getCurrentLoop()).toBe(2);
      expect(parent.textContent).toBe("Test");
    });

    test("should use loopType: clear correctly", async () => {
      typer = new TypeMorph({
        parent,
        speed: 10,
        loopCount: 2,
        loopStartDelay: 200,
        loopEndDelay: 10,
        loopType: "clear",
        showCursor: false,
      });

      const promise = typer.loop("1234567890");

      await jest.advanceTimersByTimeAsync(50);
      expect(parent.textContent.length).toBeGreaterThan(0);

      await jest.advanceTimersByTimeAsync(100);
      expect(parent.textContent).toBe("");

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe("1234567890");
      expect(typer.getCurrentLoop()).toBe(2);
    });

    test("should use loopType: backspace correctly", async () => {
      typer = new TypeMorph({
        parent,
        speed: 10,
        backspaceSpeed: 10,
        loopEndDelay: 10,
        loopCount: 2,
        loopType: "backspace",
        showCursor: false,
      });

      const text = "1234567890";
      const promise = typer.loop(text);

      await jest.advanceTimersByTimeAsync(50);
      expect(parent.textContent.length).toBeGreaterThan(0);

      await jest.advanceTimersByTimeAsync(120);
      const midText = parent.textContent;
      expect(midText.length).toBeLessThan(text.length);

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe(text);
      expect(typer.getCurrentLoop()).toBe(2);
    });

    test("should respect loopStartDelay", async () => {
      typer = new TypeMorph({
        parent,
        speed: 10,
        loopCount: 2,
        loopStartDelay: 100,
        loopEndDelay: 1,
        loopType: "clear",
        showCursor: false,
      });

      const text = "12345";
      typer.loop(text);

      await jest.advanceTimersByTimeAsync(51);
      expect(parent.textContent).toBe("");

      await jest.advanceTimersByTimeAsync(100);
      expect(parent.textContent.length).toBeGreaterThan(0);
    });

    test("should respect loopEndDelay", async () => {
      typer = new TypeMorph({
        parent,
        speed: 10,
        loopCount: 2,
        loopStartDelay: 1,
        loopEndDelay: 200,
        loopType: "clear",
        showCursor: false,
      });

      const text = "12345";
      typer.loop(text);

      await jest.advanceTimersByTimeAsync(51);

      expect(parent.textContent).toBe(text);

      await jest.advanceTimersByTimeAsync(200);
      expect(parent.textContent.length).toBeGreaterThan(0);
      expect(parent.textContent.length).toBeLessThan(text.length);
    });

    test("should use initial text if not provided", async () => {
      typer = new TypeMorph({
        parent,
        text: "initial text",
        speed: 10,
        loopCount: 2,
        loopType: "clear",
        showCursor: false,
      });

      const promise = typer.loop();

      await jest.runAllTimersAsync();
      await promise;

      expect(parent.textContent).toBe("initial text");
    });

    test("should throw when called on destroyed instance", async () => {
      typer.destroy();

      await expect(() => typer.loop("Test")).rejects.toThrow();
    });

    test("should handle loop with different parent", async () => {
      const otherParent = document.createElement("div");
      document.body.appendChild(otherParent);

      typer = new TypeMorph({
        parent,
        speed: 10,
        loopCount: 2,
        loopType: "clear",
        showCursor: false,
      });

      const promise = typer.loop("Other loop", otherParent);

      await jest.runAllTimersAsync();
      await promise;

      expect(otherParent.textContent).toBe("Other loop");
      expect(parent.textContent).toBe("");

      otherParent.remove();
    });

    test("should stop loop when stop() is called", async () => {
      typer = new TypeMorph({
        parent,
        speed: 10,
        loopCount: 10,
        loopType: "clear",
        showCursor: false,
      });

      typer.loop("Loop text");

      jest.advanceTimersByTime(200);
      await Promise.resolve();

      typer.stop();

      await jest.runAllTimersAsync();

      expect(typer.getCurrentLoop()).toBeLessThan(10);
    });
  });

  // // stop() TESTS

  // describe("stop()", () => {
  //   test("should stop typing operation", async () => {
  //     const promise = typer.type("This is a long text that will be stopped");

  //     // Advance partway through
  //     jest.advanceTimersByTime(50);
  //     await Promise.resolve();

  //     await typer.stop();

  //     await jest.runAllTimersAsync();

  //     expect(parent.textContent).not.toBe(
  //       "This is a long text that will be stopped"
  //     );
  //     expect(typer.isTyping()).toBe(false);
  //   });

  //   test("should stop loop operation", async () => {
  //     typer = new TypeMorph({
  //       parent,
  //       speed: 10,
  //       loopCount: 10,
  //       loopType: "clear",
  //       showCursor: false,
  //     });

  //     const promise = typer.loop("Loop text");

  //     jest.advanceTimersByTime(100);
  //     await Promise.resolve();

  //     await typer.stop();

  //     await jest.runAllTimersAsync();

  //     expect(typer.getCurrentLoop()).toBeLessThan(10);
  //     expect(typer.isTyping()).toBe(false);
  //   });

  //   test("should call onStop callback", async () => {
  //     const onStop = jest.fn();
  //     typer = new TypeMorph({
  //       parent,
  //       onStop,
  //       showCursor: false,
  //     });

  //     typer.type("Test");

  //     jest.advanceTimersByTime(20);
  //     await Promise.resolve();

  //     await typer.stop();

  //     expect(onStop).toHaveBeenCalledTimes(1);
  //     expect(onStop).toHaveBeenCalledWith(typer);
  //   });

  //   test("should be safe to call multiple times", async () => {
  //     typer.type("Test");

  //     await typer.stop();
  //     await typer.stop();
  //     await typer.stop();

  //     expect(typer.isTyping()).toBe(false);
  //   });

  //   test("should be safe to call when not typing", async () => {
  //     await expect(typer.stop()).resolves.not.toThrow();
  //     expect(typer.isTyping()).toBe(false);
  //   });

  //   test("should allow new type() after stop()", async () => {
  //     typer.type("First");

  //     jest.advanceTimersByTime(20);
  //     await Promise.resolve();

  //     await typer.stop();

  //     const promise = typer.type("Second");

  //     await jest.runAllTimersAsync();
  //     await promise;

  //     expect(parent.textContent).toBe("Second");
  //   });

  //   test("should throw when called on destroyed instance", async () => {
  //     typer.destroy();

  //     expect(() => typer.stop()).toThrow(/destroyed instance/);
  //   });
  // });

  // // destroy() TESTS

  // describe("destroy()", () => {
  //   test("should cleanup and mark as destroyed", () => {
  //     typer.destroy();

  //     expect(typer.isDestroyed()).toBe(true);
  //   });

  //   test("should stop ongoing typing operation", async () => {
  //     typer.type("Test text");

  //     jest.advanceTimersByTime(20);
  //     await Promise.resolve();

  //     typer.destroy();

  //     await jest.runAllTimersAsync();

  //     expect(typer.isTyping()).toBe(false);
  //     expect(typer.isDestroyed()).toBe(true);
  //   });

  //   test("should remove cursor from DOM", async () => {
  //     typer = new TypeMorph({
  //       parent,
  //       showCursor: true,
  //     });

  //     await typer.type("Test");
  //     await jest.runAllTimersAsync();

  //     const cursorBefore = parent.querySelector("[data-typemorph-cursor]");
  //     expect(cursorBefore).toBeTruthy();

  //     typer.destroy();

  //     const cursorAfter = parent.querySelector("[data-typemorph-cursor]");
  //     expect(cursorAfter).toBeNull();
  //   });

  //   test("should call onDestroy callback", () => {
  //     const onDestroy = jest.fn();
  //     typer = new TypeMorph({
  //       parent,
  //       onDestroy,
  //     });

  //     typer.destroy();

  //     expect(onDestroy).toHaveBeenCalledTimes(1);
  //     expect(onDestroy).toHaveBeenCalledWith(typer);
  //   });

  //   test("should be idempotent (safe to call multiple times)", () => {
  //     const onDestroy = jest.fn();
  //     typer = new TypeMorph({
  //       parent,
  //       onDestroy,
  //     });

  //     typer.destroy();
  //     typer.destroy();
  //     typer.destroy();

  //     expect(onDestroy).toHaveBeenCalledTimes(1);
  //     expect(typer.isDestroyed()).toBe(true);
  //   });

  //   test("should prevent further operations after destroy", () => {
  //     typer.destroy();

  //     expect(() => typer.type("Test")).toThrow(/destroyed instance/);
  //     expect(() => typer.loop("Test")).toThrow(/destroyed instance/);
  //     expect(() => typer.stop()).toThrow(/destroyed instance/);
  //   });

  //   test("should cleanup abort controller", () => {
  //     typer.type("Test");

  //     expect(typer._abortController).toBeDefined();

  //     typer.destroy();

  //     expect(typer._abortController).toBeNull();
  //   });

  //   test("should cleanup all active timers", async () => {
  //     typer.type("Test text");

  //     jest.advanceTimersByTime(20);
  //     await Promise.resolve();

  //     const timersBefore = typer._activeTimers.size;
  //     expect(timersBefore).toBeGreaterThan(0);

  //     typer.destroy();

  //     expect(typer._activeTimers.size).toBe(0);
  //   });
  // });

  // // STATE INTROSPECTION TESTS

  // describe("State Methods", () => {
  //   test("isTyping() should return correct state", async () => {
  //     expect(typer.isTyping()).toBe(false);

  //     const promise = typer.type("Test");
  //     expect(typer.isTyping()).toBe(true);

  //     await jest.runAllTimersAsync();
  //     await promise;

  //     expect(typer.isTyping()).toBe(false);
  //   });

  //   test("isDestroyed() should return correct state", () => {
  //     expect(typer.isDestroyed()).toBe(false);

  //     typer.destroy();

  //     expect(typer.isDestroyed()).toBe(true);
  //   });

  //   test("getCurrentLoop() should return correct loop count", async () => {
  //     typer = new TypeMorph({
  //       parent,
  //       speed: 10,
  //       loopCount: 3,
  //       loopType: "clear",
  //       showCursor: false,
  //     });

  //     expect(typer.getCurrentLoop()).toBe(0);

  //     const promise = typer.loop("Test");

  //     await jest.runAllTimersAsync();
  //     await promise;

  //     expect(typer.getCurrentLoop()).toBe(3);
  //   });
  // });

  // // INTEGRATION TESTS

  // describe("Integration Scenarios", () => {
  //   test("should handle alternating type() and stop() calls", async () => {
  //     for (let i = 0; i < 5; i++) {
  //       typer.type(`Text ${i}`);
  //       jest.advanceTimersByTime(10);
  //       await Promise.resolve();
  //       await typer.stop();
  //     }

  //     expect(typer.isTyping()).toBe(false);
  //     expect(() => typer.isDestroyed()).not.toThrow();
  //   });

  //   test("should handle rapid sequential type() calls", async () => {
  //     const promises = [];
  //     for (let i = 0; i < 10; i++) {
  //       promises.push(typer.type(`Text ${i}`));
  //     }

  //     await jest.runAllTimersAsync();

  //     // Last call should win
  //     expect(parent.textContent).toBe("Text 9");
  //   });

  //   test("should handle type() -> stop() -> type() -> destroy() sequence", async () => {
  //     typer.type("First");
  //     jest.advanceTimersByTime(20);
  //     await Promise.resolve();

  //     await typer.stop();

  //     const promise = typer.type("Second");
  //     await jest.runAllTimersAsync();
  //     await promise;

  //     expect(parent.textContent).toBe("Second");

  //     typer.destroy();
  //     expect(typer.isDestroyed()).toBe(true);
  //   });

  //   test("should handle loop() with stop() mid-loop", async () => {
  //     typer = new TypeMorph({
  //       parent,
  //       speed: 10,
  //       loopCount: 5,
  //       loopType: "clear",
  //       showCursor: false,
  //     });

  //     typer.loop("Loop text");

  //     // Let some iterations happen
  //     jest.advanceTimersByTime(100);
  //     await Promise.resolve();

  //     await typer.stop();

  //     const loopCount = typer.getCurrentLoop();
  //     expect(loopCount).toBeGreaterThan(0);
  //     expect(loopCount).toBeLessThan(5);
  //   });
  // });
});
