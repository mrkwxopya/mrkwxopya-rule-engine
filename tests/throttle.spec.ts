import { describe, expect, it } from "vitest";
import { InMemoryThrottle } from "../src/index.js";

describe("throttle", () => {
  it("blocks when max calls is exceeded", () => {
    const throttle = new InMemoryThrottle();

    throttle.check("player-1", {
      maxCalls: 2,
      windowMs: 1_000
    });

    throttle.check("player-1", {
      maxCalls: 2,
      windowMs: 1_000
    });

    expect(() =>
      throttle.check("player-1", {
        maxCalls: 2,
        windowMs: 1_000
      })
    ).toThrow();
  });
});