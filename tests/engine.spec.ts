import { describe, expect, it, vi } from "vitest";
import { RuleEngine } from "../src/index.js";

describe("RuleEngine", () => {
  it("evaluates a matching rule and runs its action", async () => {
    const engine = new RuleEngine({
      engineName: "test-engine",
      strictMode: true
    });

    const actionSpy = vi.fn();

    engine.registerAction("grant_bonus", (payload) => {
      actionSpy(payload);
    });

    engine.registerRule({
      metadata: {
        id: "low-score-bonus",
        name: "Low Score Bonus",
        version: "1.0.0",
        enabled: true,
        priority: 100
      },
      when: {
        type: "comparison",
        field: "player.score",
        operator: "lt",
        value: 10
      },
      then: [
        {
          type: "grant_bonus",
          payload: { amount: 50 }
        }
      ]
    });

    const result = await engine.evaluate({
      facts: {
        player: {
          score: 5
        }
      }
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.matched).toBe(true);
    expect(actionSpy).toHaveBeenCalledTimes(1);
    expect(actionSpy).toHaveBeenCalledWith({ amount: 50 });
  });

  it("does not match when condition fails", async () => {
    const engine = new RuleEngine({
      engineName: "test-engine",
      strictMode: true
    });

    const actionSpy = vi.fn();

    engine.registerAction("grant_bonus", (payload) => {
      actionSpy(payload);
    });

    engine.registerRule({
      metadata: {
        id: "high-score-only",
        name: "High Score Only",
        version: "1.0.0",
        enabled: true,
        priority: 100
      },
      when: {
        type: "comparison",
        field: "player.score",
        operator: "gt",
        value: 100
      },
      then: [
        {
          type: "grant_bonus",
          payload: { amount: 50 }
        }
      ]
    });

    const result = await engine.evaluate({
      facts: {
        player: {
          score: 5
        }
      }
    });

    expect(result.results[0]?.matched).toBe(false);
    expect(actionSpy).not.toHaveBeenCalled();
  });

  it("sorts rules by priority descending, then id ascending", () => {
    const engine = new RuleEngine({
      engineName: "test-engine"
    });

    engine.registerRule({
      metadata: {
        id: "b-rule",
        name: "B Rule",
        version: "1.0.0",
        enabled: true,
        priority: 10
      },
      when: {
        type: "comparison",
        field: "value",
        operator: "eq",
        value: 1
      },
      then: [{ type: "noop" }]
    });

    engine.registerRule({
      metadata: {
        id: "a-rule",
        name: "A Rule",
        version: "1.0.0",
        enabled: true,
        priority: 10
      },
      when: {
        type: "comparison",
        field: "value",
        operator: "eq",
        value: 1
      },
      then: [{ type: "noop" }]
    });

    const rules = engine.getRules();

    expect(rules[0]?.metadata.id).toBe("a-rule");
    expect(rules[1]?.metadata.id).toBe("b-rule");
  });

    it("evaluates batch items", async () => {
    const engine = new RuleEngine({
      engineName: "batch-engine",
      strictMode: false
    });

    engine.registerRule({
      metadata: {
        id: "rule-1",
        name: "Rule 1",
        version: "1.0.0",
        enabled: true,
        priority: 1
      },
      when: {
        type: "comparison",
        field: "value",
        operator: "eq",
        value: 1
      },
      then: [{ type: "noop" }]
    });

    const batch = await engine.evaluateBatch([
      { id: "a", options: { facts: { value: 1 } } },
      { id: "b", options: { facts: { value: 2 } } }
    ]);

    expect(batch).toHaveLength(2);
    expect(batch[0]?.id).toBe("a");
    expect(batch[1]?.id).toBe("b");
  });
});