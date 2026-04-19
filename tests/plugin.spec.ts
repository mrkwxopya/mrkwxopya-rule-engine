import { describe, expect, it, vi } from "vitest";
import { RuleEngine, type EnginePlugin } from "../src/index.js";

describe("plugins", () => {
  it("installs a plugin once", async () => {
    const metricSpy = vi.fn();

    const plugin: EnginePlugin = {
      name: "test-plugin",
      setup(api) {
        api.addMetricListener((event) => {
          metricSpy(event.name);
        });

        api.registerAction("plugin_action", () => {
          return;
        });
      }
    };

    const engine = new RuleEngine({
      engineName: "plugin-engine",
      strictMode: true
    });

    engine.use(plugin);
    engine.use(plugin);

    engine.registerRule({
      metadata: {
        id: "plugin-rule",
        name: "Plugin Rule",
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
      then: [{ type: "plugin_action" }]
    });

    await engine.evaluate({
      facts: { value: 1 }
    });

    expect(engine.listPlugins()).toEqual(["test-plugin"]);
    expect(metricSpy).toHaveBeenCalled();
  });
});