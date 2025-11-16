import { expect, jest } from "@jest/globals";
import TypeMorph from "../../src/typemorph.js";
import { assertNoMemoryLeaks } from "../common.js";

describe("TypeMorph - Input Validation", () => {
  let parent;

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '<div id="target"></div>';
    parent = document.getElementById("target");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Constructor Validation", () => {
    test("should throw when parent element not found by ID", () => {
      expect(() => {
        new TypeMorph({ parent: "nonexistent-id" });
      }).toThrow();
    });

    test("should throw when parent selector doesn't match any element", () => {
      expect(() => {
        new TypeMorph({ parent: {} });
      }).toThrow();
    });

    test("should throw when parent is null and we try to type without providing parent", async () => {
      const typer = new TypeMorph({ parent: null });
      await expect(typer.type("Test")).rejects.toThrow();
    });

    test("should throw when parent is undefined and we try to type without providing parent", async () => {
      const typer = new TypeMorph({ parent: undefined });
      await expect(typer.type("Test")).rejects.toThrow();
    });

    test("should accept valid parent element", () => {
      expect(() => {
        const typer = new TypeMorph({ parent });
        typer.destroy();
      }).not.toThrow();
    });

    test("should accept valid parent selector", () => {
      expect(() => {
        const typer = new TypeMorph({ parent: "target" });
        typer.destroy();
      }).not.toThrow();
    });

    test("should throw when speed is negative", () => {
      expect(() => {
        new TypeMorph({ parent, speed: -1 });
      }).toThrow(/speed/);
    });

    test("should throw when backspaceSpeed is negative", () => {
      expect(() => {
        new TypeMorph({ parent, backspaceSpeed: -1 });
      }).toThrow(/backspaceSpeed/);
    });

    test("should throw when speed is not a number", () => {
      expect(() => {
        new TypeMorph({ parent, speed: "fast" });
      }).toThrow(/speed/);
    });

    test("should throw when speed is not a number (temp config)", async () => {
      const typer = new TypeMorph({ parent });
      await expect(typer.type("hi", { speed: "fast" })).rejects.toThrow(
        /speed/
      );
    });

    test("should accept speed of 0", () => {
      expect(() => {
        const typer = new TypeMorph({ parent, speed: 0 });
        typer.destroy();
      }).not.toThrow();
    });

    test("should throw when chunkSize is less than 1", () => {
      expect(() => {
        new TypeMorph({ parent, chunkSize: 0 });
      }).toThrow(/chunkSize/);
    });

    test("should throw when chunkSize is not a number", () => {
      expect(() => {
        new TypeMorph({ parent, chunkSize: "big" });
      }).toThrow(/chunkSize/);
    });

    test("should throw when loopCount is negative", () => {
      expect(() => {
        new TypeMorph({ parent, loopCount: -1 });
      }).toThrow(/loopCount/);
    });

    test("should throw when loopCount is negative (temp config)", async () => {
      const typer = new TypeMorph({ parent });
      await expect(typer.loop("hi", { loopCount: -1 })).rejects.toThrow(
        /loopCount/
      );
    });

    test("should throw when loopCount is not a number", () => {
      expect(() => {
        new TypeMorph({ parent, loopCount: "many" });
      }).toThrow(/loopCount/);
    });

    test("should accept loopCount of 0", () => {
      expect(() => {
        const typer = new TypeMorph({ parent, loopCount: 0 });
        typer.destroy();
      }).not.toThrow();
    });
  });

  describe("Text Validation", () => {
    let typer;

    beforeEach(() => {
      typer = new TypeMorph({
        parent,
        speed: 10,
        showCursor: false,
      });
    });

    afterEach(() => {
      if (typer && !typer.isDestroyed()) {
        typer.destroy();
      }
    });

    test("should handle empty string gracefully", async () => {
      typer.type("");
      await jest.runAllTimersAsync();

      expect(parent.textContent).toBe("");
      expect(typer.isTyping()).toBe(false);
    });

    test("should convert numbers to string", async () => {
      typer.type(123);
      await jest.runAllTimersAsync();
      expect(parent.textContent).toBe("123");
    });

    test("should convert arrays to string", async () => {
      typer.type(["a", "b", "c"]);
      await jest.runAllTimersAsync();
      expect(parent.textContent).toBe("a,b,c");
    });

    test("should convert objects to [object Object]", async () => {
      typer.type({ key: "value" });
      await jest.runAllTimersAsync();
      expect(parent.textContent).toBe("[object Object]");
    });

    test("should throw on null or undefined", async () => {
      await expect(typer.type(null)).rejects.toThrow(/text/);
      await expect(typer.type(undefined)).rejects.toThrow(/text/);
      expect(parent.textContent).toBe("");
    });

    test("should handle boolean as text", async () => {
      typer.type(true);
      await jest.runAllTimersAsync();
      expect(parent.textContent).toBe("true");
    });
  });

  describe("Parent Validation (Runtime)", () => {
    let typer;

    beforeEach(() => {
      typer = new TypeMorph({
        parent,
        speed: 10,
        showCursor: false,
      });
    });

    afterEach(() => {
      if (typer && !typer.isDestroyed()) {
        typer.destroy();
      }
    });

    test("should handle parent being removed from DOM during typing", async () => {
      const promise = typer.type("Hello World");

      await jest.advanceTimersByTimeAsync(30);
      parent.remove();
      await jest.runAllTimersAsync();

      await expect(promise).resolves.toBeUndefined();
      expect(typer.isTyping()).toBe(false);
      assertNoMemoryLeaks(typer);
    });

    test("should handle parent being removed from DOM during backspacing", async () => {
      typer = new TypeMorph({
        parent,
        speed: 10,
        backspaceSpeed: 10,
        showCursor: false,
        loopStartDelay: 0,
        loopEndDelay: 0,
        loopType: "backspace",
      });

      const promise = typer.loop("12345");

      await jest.advanceTimersByTimeAsync(7);
      parent.remove();
      await jest.runAllTimersAsync();

      await expect(promise).resolves.toBeUndefined();
      expect(typer.isTyping()).toBe(false);
      assertNoMemoryLeaks(typer);
    });

    test("should throw when typing to invalid parent selector", async () => {
      const otherParent = document.createElement("div");
      otherParent.id = "valid-parent";
      document.body.appendChild(otherParent);

      typer.type("Test", otherParent);
      await jest.runAllTimersAsync();

      otherParent.remove();

      const promise = typer.type("Test2", "valid-parent");
      await expect(promise).rejects.toThrow(/parent/);
    });

    test("should throw on invalid parent during type() call", async () => {
      const promise = typer.type("Test", "nonexistent-parent");
      await expect(promise).rejects.toThrow(/parent/);
    });
  });

  describe("Callback Validation", () => {
    test("should handle onFinish callback throwing error", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 10,
        showCursor: false,
        onFinish: () => {
          throw new Error("Callback error");
        },
      });

      typer.type("Test");
      await jest.runAllTimersAsync();

      expect(parent.textContent).toBe("Test");
      expect(typer.isTyping()).toBe(false);

      typer.destroy();
    });

    test("should handle onStop callback throwing error", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 10,
        showCursor: false,
        onStop: () => {
          throw new Error("Stop callback error");
        },
      });

      typer.type("Test");
      await jest.advanceTimersByTimeAsync(20);

      await expect(typer.stop()).resolves.not.toThrow();
      typer.destroy();
    });

    test("should handle onDestroy callback throwing error", () => {
      const typer = new TypeMorph({
        parent,
        onDestroy: () => {
          throw new Error("Destroy callback error");
        },
      });

      expect(() => typer.destroy()).not.toThrow();
    });

    test("should handle async callback errors", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 10,
        showCursor: false,
        onFinish: async () => {
          await Promise.resolve();
          throw new Error("Async callback error");
        },
      });

      typer.type("Test");
      await jest.runAllTimersAsync();

      expect(parent.textContent).toBe("Test");

      typer.destroy();
    });

    test("should handle non-function callbacks gracefully", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 10,
        showCursor: false,
        onFinish: "not a function",
        onStop: 123,
        onDestroy: null,
      });

      typer.type("Test");
      await jest.runAllTimersAsync();

      expect(parent.textContent).toBe("Test");

      typer.destroy();
    });
  });

  describe("Edge Cases", () => {
    let typer;

    beforeEach(() => {
      typer = new TypeMorph({
        parent,
        speed: 10,
        showCursor: false,
      });
    });

    afterEach(() => {
      if (typer && !typer.isDestroyed()) {
        typer.destroy();
      }
    });

    test("should handle text with null characters", async () => {
      const textWithNull = "Hello\x00World";

      typer.type(textWithNull);
      await jest.runAllTimersAsync();

      expect(parent.textContent).toContain("Hello");
    });

    test("should handle text with control characters", async () => {
      const textWithControl = "Hello\x01\x02\x03World";

      typer.type(textWithControl);
      await jest.runAllTimersAsync();

      expect(typer.isTyping()).toBe(false);
    });

    test("should handle mixed RTL and LTR text", async () => {
      const mixedText = "Hello مرحبا World";

      typer.type(mixedText);
      await jest.runAllTimersAsync();

      expect(parent.textContent).toBe(mixedText);
    });

    test("should handle zero-width characters", async () => {
      const textWithZeroWidth = "Hello\u200BWorld"; // Zero-width space

      typer.type(textWithZeroWidth);
      await jest.runAllTimersAsync();

      expect(parent.textContent.length).toBe(11); // Including zero-width char
    });

    test("should handle combining diacritical marks", async () => {
      const textWithDiacritics = "café";

      typer.type(textWithDiacritics);
      await jest.runAllTimersAsync();

      expect(parent.textContent).toBe(textWithDiacritics);
    });
  });
});
