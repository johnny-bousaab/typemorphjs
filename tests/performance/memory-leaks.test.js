import { expect, jest } from "@jest/globals";
import TypeMorph from "../../src/typemorph.js";
import { assertNoMemoryLeaks, createPerformanceMonitor } from "../common.js";

const SPEED = 10;

describe("TypeMorph - Memory Leaks & Performance", () => {
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
      showCursor: false,
    });
  });

  afterEach(() => {
    if (typer && !typer.isDestroyed()) {
      typer.destroy();
    }
    jest.useRealTimers();
  });

  describe("Timer Cleanup", () => {
    test("should cleanup all timers after typing completes", async () => {
      const typer = new TypeMorph({
        parent,
      });

      typer.type("Hello World");
      await jest.runAllTimersAsync();

      assertNoMemoryLeaks(typer);

      typer.destroy();
    });

    test("should cleanup all timers after stop()", async () => {
      typer.type("This is a long text that will be stopped");

      await jest.advanceTimersByTimeAsync(SPEED * 5);

      await typer.stop();

      assertNoMemoryLeaks(typer);

      typer.destroy();
    });

    test("should cleanup all timers after destroy()", async () => {
      typer.type("Test text");

      await jest.advanceTimersByTimeAsync(SPEED * 3);

      typer.destroy();

      assertNoMemoryLeaks(typer);
    });

    test("should cleanup timers when cancelling with new type()", async () => {
      typer.type("First text");

      await jest.advanceTimersByTimeAsync(SPEED * 2);

      typer.type("Second text");

      await jest.advanceTimersByTimeAsync(SPEED * 2);

      expect(typer._activeTimers.size).toBeGreaterThanOrEqual(0);

      await jest.runAllTimersAsync();

      assertNoMemoryLeaks(typer);

      typer.destroy();
    });

    test("should cleanup timers after loop operation", async () => {
      const typer = new TypeMorph({
        parent,
        speed: SPEED,
        loopCount: 3,
        loopType: "clear",
        showCursor: false,
      });

      typer.loop("Loop text");
      await jest.runAllTimersAsync();

      assertNoMemoryLeaks(typer);

      typer.destroy();
    });

    test("should cleanup timers when loop is stopped", async () => {
      const typer = new TypeMorph({
        parent,
        speed: SPEED,
        loopCount: 10,
        loopType: "clear",
      });

      typer.loop("Loop text");

      await jest.advanceTimersByTimeAsync(SPEED * 2);

      await typer.stop();

      assertNoMemoryLeaks(typer);

      typer.destroy();
    });
  });

  describe("DOM Cleanup", () => {
    test("should remove cursor element on destroy, even if hideCursorOnFinishTyping is false", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 10,
        showCursor: true,
        hideCursorOnFinishTyping: false,
      });

      typer.type("Test");
      await jest.runAllTimersAsync();

      const cursorBefore = parent.querySelector("[data-typemorph-cursor]");
      expect(cursorBefore).toBeTruthy();

      typer.destroy();

      const cursorAfter = parent.querySelector("[data-typemorph-cursor]");
      expect(cursorAfter).toBeNull();
    });

    test("should hide cursor on finish when configured", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 10,
        showCursor: true,
        hideCursorOnFinishTyping: true,
      });

      typer.type("Test");
      await jest.runAllTimersAsync();

      const cursor = parent.querySelector("[data-typemorph-cursor]");
      expect(cursor).toBeNull();

      typer.destroy();
    });

    test("should not leak cursor elements on multiple type() calls", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 10,
        showCursor: true,
        hideCursorOnFinishTyping: false,
      });

      for (let i = 0; i < 5; i++) {
        typer.type(`Text ${i}`);
        await jest.runAllTimersAsync();
      }

      const cursors = parent.querySelectorAll("[data-typemorph-cursor]");
      expect(cursors.length).toBe(1);

      typer.destroy();

      const cursorsAfterDestoryed = parent.querySelectorAll(
        "[data-typemorph-cursor]"
      );
      expect(cursorsAfterDestoryed.length).toBe(0);
    });

    test("should not leak text nodes", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 10,
        showCursor: false,
        clearBeforeTyping: true,
      });

      const initialChildCount = parent.childNodes.length;

      for (let i = 0; i < 5; i++) {
        typer.type("Test");
        await jest.runAllTimersAsync();
      }

      expect(parent.childNodes.length).toBeLessThanOrEqual(
        initialChildCount + 2
      ); // Text node + maybe cursor

      typer.destroy();
    });
  });

  describe("Memory Usage", () => {
    test("should handle multiple instances without leaks", () => {
      const typers = [];

      for (let i = 0; i < 10; i++) {
        const div = document.createElement("div");
        document.body.appendChild(div);
        typers.push(new TypeMorph({ parent: div, showCursor: false }));
      }

      typers.forEach((t) => t.destroy());

      expect(typers.every((t) => t.isDestroyed())).toBe(true);

      for (const typer of typers) {
        assertNoMemoryLeaks(typer);
      }

      document.querySelectorAll("div").forEach((d) => d.remove());
    });

    test("should handle rapid create/destroy cycles", () => {
      for (let i = 0; i < 20; i++) {
        const typer = new TypeMorph({
          parent,
          speed: 10,
          showCursor: false,
        });

        typer.type("Test".repeat(10000));
        typer.destroy();

        expect(typer.isDestroyed()).toBe(true);
        assertNoMemoryLeaks(typer);
      }
    });
  });

  describe("Performance and Accuracy", () => {
    test("should type characters in time", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 1,
        showCursor: false,
      });

      const start = Date.now();

      typer.type("A".repeat(10));
      await jest.runAllTimersAsync();

      const duration = Date.now() - start;

      expect(duration).toBe(10);

      typer.destroy();
    });

    test("should handle rapid sequential operations efficiently", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 1,
        showCursor: false,
      });

      const start = Date.now();

      for (let i = 0; i < 5; i++) {
        typer.type("A".repeat(10));
        await jest.runAllTimersAsync();
      }

      const duration = Date.now() - start;

      expect(duration).toBe(50);

      typer.destroy();
    });

    test("should batch DOM updates efficiently", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 10,
        chunkSize: 5,
        showCursor: false,
      });

      let mutationCount = 0;

      const observer = new MutationObserver(() => {
        mutationCount++;
      });

      observer.observe(parent, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      const text = "A".repeat(25);

      typer.type(text);
      await jest.runAllTimersAsync();

      observer.disconnect();

      expect(parent.textContent).toBe(text);

      expect(mutationCount).toBeLessThanOrEqual(5);

      typer.destroy();
    });
  });

  describe("Stress Tests", () => {
    test("should handle 100 rapid type() calls", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 5,
        showCursor: false,
      });

      for (let i = 0; i < 100; i++) {
        typer.type(`Text ${i}`);
      }

      await jest.runAllTimersAsync();

      expect(parent.textContent).toBe("Text 99");
      expect(typer.isTyping()).toBe(false);
      assertNoMemoryLeaks(typer);

      typer.destroy();
    });

    test("should handle multiple loops without leaks", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 5,
        loopCount: 5,
        loopType: "clear",
        showCursor: false,
      });

      typer.loop("Loop");
      await jest.runAllTimersAsync();

      assertNoMemoryLeaks(typer);
      expect(typer.getCurrentLoop()).toBe(5);

      typer.destroy();
    });

    test("should handle destroy() while processing many operations", async () => {
      const typer = new TypeMorph({
        parent,
        speed: 5,
        showCursor: false,
      });

      for (let i = 0; i < 50; i++) {
        typer.type(`Text ${i}`);
      }

      await jest.advanceTimersByTimeAsync(50);

      typer.destroy();

      expect(typer.isDestroyed()).toBe(true);
      assertNoMemoryLeaks(typer);
    });
  });

  describe("Memory Growth", () => {
    test("should not leak memory during create/destroy cycles", async () => {
      if (!global.gc) {
        console.warn("Skipping memory test - run with --expose-gc flag");
        return;
      }

      const monitor = createPerformanceMonitor();
      const observer = monitor.startMonitoring();

      monitor.takeMemorySnapshot();

      for (let i = 0; i < 50; i++) {
        const typer = new TypeMorph({
          parent,
          speed: 5,
          showCursor: false,
        });

        typer.type(`Iteration ${i}`);
        await jest.runAllTimersAsync();

        typer.destroy();

        if (i % 10 === 0 && i > 0) {
          monitor.takeMemorySnapshot();
        }
      }

      monitor.takeMemorySnapshot();

      observer.disconnect();

      const metrics = monitor.getMetrics();
      console.log(`Total DOM updates: ${metrics.domUpdates}`);

      monitor.assertNoMemoryGrowth(0.2);
    }, 30000);

    test("should not leak memory during rapid type() calls", async () => {
      if (!global.gc) {
        console.warn("Skipping memory test - run with --expose-gc flag");
        return;
      }

      const monitor = createPerformanceMonitor();
      monitor.takeMemorySnapshot();

      const typer = new TypeMorph({
        parent,
        speed: 1,
        showCursor: false,
      });

      for (let i = 0; i < 100; i++) {
        typer.type(`Text ${i}`);

        if (i % 20 === 0 && i > 0) {
          monitor.takeMemorySnapshot();
        }
      }

      await jest.runAllTimersAsync();

      monitor.takeMemorySnapshot();

      typer.destroy();

      monitor.assertNoMemoryGrowth(0.2);
    }, 30000);

    test("should not leak memory during loop operations", async () => {
      if (!global.gc) {
        console.warn("Skipping memory test - run with --expose-gc flag");
        return;
      }

      const monitor = createPerformanceMonitor();
      monitor.takeMemorySnapshot();

      for (let i = 0; i < 20; i++) {
        const typer = new TypeMorph({
          parent,
          speed: 1,
          loopCount: 3,
          loopType: "backspace",
          showCursor: false,
        });

        typer.loop("Test");
        await jest.runAllTimersAsync();

        typer.destroy();

        if (i % 5 === 0 && i > 0) {
          monitor.takeMemorySnapshot();
        }
      }

      monitor.takeMemorySnapshot();

      monitor.assertNoMemoryGrowth(0.2);
    }, 30000);

    test("should not accumulate DOM nodes over time", async () => {
      const monitor = createPerformanceMonitor();
      const observer = monitor.startMonitoring();

      const typer = new TypeMorph({
        parent,
        speed: 5,
        showCursor: true,
        hideCursorOnFinishTyping: true,
        clearBeforeTyping: true,
      });

      const initialNodeCount = parent.childNodes.length;

      for (let i = 0; i < 30; i++) {
        typer.type(`Text ${i}`);
        await jest.runAllTimersAsync();
      }

      const finalNodeCount = parent.childNodes.length;

      observer.disconnect();

      expect(finalNodeCount).toBeLessThanOrEqual(initialNodeCount + 1);

      typer.destroy();
    }, 30000);

    test("should limit DOM mutations with chunking", async () => {
      const monitor = createPerformanceMonitor();
      const observer = monitor.startMonitoring();

      const typer = new TypeMorph({
        parent,
        speed: 5,
        chunkSize: 10,
        showCursor: false,
      });

      const text = "A".repeat(50);
      typer.type(text);
      await jest.runAllTimersAsync();

      observer.disconnect();

      const metrics = monitor.getMetrics();

      expect(metrics.domUpdates).toBe(5);

      typer.destroy();
    });

    test("should handle memory pressure during concurrent operations", async () => {
      if (!global.gc) {
        console.warn("Skipping memory test - run with --expose-gc flag");
        return;
      }

      const monitor = createPerformanceMonitor();
      monitor.takeMemorySnapshot();

      const typers = [];

      for (let i = 0; i < 10; i++) {
        const div = document.createElement("div");
        document.body.appendChild(div);

        typers.push(
          new TypeMorph({
            parent: div,
            speed: 5,
            showCursor: false,
          })
        );
      }

      monitor.takeMemorySnapshot();

      const promises = typers.map((typer, i) =>
        typer.type(`Instance ${i} text`)
      );

      await jest.runAllTimersAsync();

      monitor.takeMemorySnapshot();

      typers.forEach((t) => t.destroy());

      document.querySelectorAll("div").forEach((d) => {
        if (d.id !== "target") d.remove();
      });

      monitor.takeMemorySnapshot();

      const snapshots = monitor.getMetrics().memorySnapshots;
      const initialMem = snapshots[0].heapUsed;
      const finalMem = snapshots[snapshots.length - 1].heapUsed;
      const growth = (finalMem - initialMem) / initialMem;

      expect(growth).toBeLessThan(0.2);
    }, 30000);
  });
});
