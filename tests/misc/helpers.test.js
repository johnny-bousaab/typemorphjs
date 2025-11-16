import { expect, jest } from "@jest/globals";
import { injectCursorCSS, safeCallback } from "../../src/helpers.js";

describe("helpers.js", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    document.head.innerHTML = "";
  });

  describe("injectCursorCSS()", () => {
    test("should inject style element once", () => {
      injectCursorCSS();
      const styleEl = document.getElementById("typemorph-cursor-style");
      expect(styleEl).not.toBeNull();
      expect(styleEl.textContent).toMatch(/typemorph-cursor/);

      injectCursorCSS();
      const allStyles = document.querySelectorAll("#typemorph-cursor-style");
      expect(allStyles.length).toBe(1);
    });

    test("should append style element to document head", () => {
      injectCursorCSS();
      const styleEl = document.head.querySelector("#typemorph-cursor-style");
      expect(styleEl).not.toBeNull();
      expect(document.head.contains(styleEl)).toBe(true);
    });
  });

  describe("safeCallback()", () => {
    test("should call sync callback safely", async () => {
      const cb = jest.fn();
      await safeCallback(cb, 1, 2, 3);
      expect(cb).toHaveBeenCalledWith(1, 2, 3);
    });

    test("should await async callback", async () => {
      const cb = jest.fn().mockResolvedValue("done");
      await safeCallback(cb);
      expect(cb).toHaveBeenCalled();
    });

    test("should handle thrown errors gracefully", async () => {
      const spyWarn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const cb = jest.fn(() => {
        throw new Error("Boom");
      });

      await safeCallback(cb);
      expect(spyWarn).toHaveBeenCalledWith(
        "TypeMorph: User callback error:",
        expect.any(Error)
      );

      spyWarn.mockRestore();
    });

    test("should not throw if callback is not a function", async () => {
      await expect(safeCallback(null)).resolves.not.toThrow();
      await expect(safeCallback(undefined)).resolves.not.toThrow();
      await expect(safeCallback(123)).resolves.not.toThrow();
    });
  });
});
