import { describe, expect, it } from "vitest";
import { RuleEngine, isRuleActive, validateRuleLifecycle } from "../src/index.js";

describe("governance", () => {
  it("validates lifecycle dates", () => {
    expect(() =>
      validateRuleLifecycle({
        metadata: {
          id: "rule-1",
          name: "Rule 1",
          version: "1.0.0",
          enabled: true,
          priority: 1,
          effectiveFrom: "2026-05-01T00:00:00.000Z",
          effectiveTo: "2026-04-01T00:00:00.000Z"
        },
        when: {
          type: "comparison",
          field: "x",
          operator: "eq",
          value: 1
        },
        then: [{ type: "noop" }]
      })
    ).toThrow();
  });

  it("detects active rules correctly", () => {
    const rule = {
      metadata: {
        id: "rule-1",
        name: "Rule 1",
        version: "1.0.0",
        enabled: true,
        priority: 1,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveTo: "2026-12-31T23:59:59.999Z"
      },
      when: {
        type: "comparison",
        field: "x",
        operator: "eq",
        value: 1
      },
      then: [{ type: "noop" }]
    };

    expect(isRuleActive(rule, new Date("2026-06-01T00:00:00.000Z"))).toBe(true);
  });

  it("filters by namespace and tenant during evaluation", async () => {
    const engine = new RuleEngine({
      engineName: "test-engine",
      strictMode: false
    });

    engine.registerRule({
      metadata: {
        id: "tenant-rule",
        name: "Tenant Rule",
        version: "1.0.0",
        enabled: true,
        priority: 1,
        namespace: "game",
        tenantId: "tenant-a"
      },
      when: {
        type: "comparison",
        field: "score",
        operator: "lt",
        value: 10
      },
      then: [{ type: "noop" }]
    });

    const result = await engine.evaluate({
      facts: { score: 5 },
      namespace: "game",
      tenantId: "tenant-a"
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.matched).toBe(true);
  });
});