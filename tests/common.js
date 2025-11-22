export const CURSOR_SELECTOR = "[data-typemorph-cursor]";

export function assertNoMemoryLeaks(typer, cursorNotExpected = true) {
  expect(typer._activeTimers.size).toBe(0);
  expect(typer._abortController).toBeNull();
  expect(typer._scrollListener).toBeNull();

  if (typer._operationQueue) {
    expect(Promise.resolve(typer._operationQueue)).resolves.toBeUndefined();
  }
  if (cursorNotExpected) expect(typer._cursorEl).toBeNull();
}

export function createPerformanceMonitor(printInfo = true) {
  const metrics = {
    domUpdates: 0,
    memorySnapshots: [],
  };

  return {
    startMonitoring() {
      const observer = new MutationObserver(() => {
        metrics.domUpdates++;
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return observer;
    },

    getMetrics() {
      return { ...metrics };
    },

    takeMemorySnapshot() {
      if (global.gc) {
        global.gc();
      }
      metrics.memorySnapshots.push(process.memoryUsage());
    },

    assertNoMemoryGrowth(maxGrowthPercent = 0.2) {
      if (metrics.memorySnapshots.length < 2) {
        throw new Error("Need at least 2 memory snapshots");
      }

      const first = metrics.memorySnapshots[0];
      const last = metrics.memorySnapshots[metrics.memorySnapshots.length - 1];

      const growth = (last.heapUsed - first.heapUsed) / first.heapUsed;
      const growthMB = (last.heapUsed - first.heapUsed) / 1024 / 1024;

      if (printInfo) {
        console.log(
          `Memory growth: ${(growth * 100).toFixed(2)}% (${growthMB.toFixed(
            2
          )} MB)`
        );
        console.log(`Initial: ${(first.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Final: ${(last.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      }

      expect(growth).toBeLessThan(maxGrowthPercent);
    },
  };
}
