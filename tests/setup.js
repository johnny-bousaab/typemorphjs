import { jest } from "@jest/globals";

HTMLElement.prototype.scrollIntoView = jest.fn();

const helpers = await import("../src/helpers.js");
jest.unstable_mockModule("../src/helpers.js", async () => {
  return {
    ...helpers,
    loadCdns: helpers.loadNodeDeps,
  };
});
