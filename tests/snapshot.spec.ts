import { describe, expect, it } from "vitest";
import { RuleEngine } from "../src/index.js";

describe("snapshot", () => {
  it("creates an evaluation snapshot", async () => {
    const engine = new RuleEngine({
      engineName: "snapshot-engine",
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

    const facts = { value: 1 };

    const result = await engine.evaluate({ facts });
    const snapshot = engine.createSnapshot(facts, result);

    expect(snapshot.engineName).toBe("snapshot-engine");
    expect(snapshot.result.evaluationId).toBe(result.evaluationId);
    expect(snapshot.rules).toHaveLength(1);
  });

    it("replays a snapshot record", async () => {
    const engine = new RuleEngine({
      engineName: "replay-engine",
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

    const facts = { value: 1 };
    const result = await engine.evaluate({ facts });
    const snapshot = engine.createSnapshot(facts, result);
    const record = engine.createReplayRecord(facts, snapshot);
    const replayed = await engine.replay(record);

    expect(replayed.results).toHaveLength(1);
    expect(replayed.results[0]?.matched).toBe(true);
  });
});