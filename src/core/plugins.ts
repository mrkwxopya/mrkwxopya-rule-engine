import type { EnginePlugin, EnginePluginApi } from "./types.js";

export class PluginManager {
  readonly #installed = new Set<string>();

  public use(plugin: EnginePlugin, api: EnginePluginApi): void {
    if (this.#installed.has(plugin.name)) {
      return;
    }

    plugin.setup(api);
    this.#installed.add(plugin.name);
  }

  public has(name: string): boolean {
    return this.#installed.has(name);
  }

  public list(): readonly string[] {
    return Object.freeze([...this.#installed]);
  }
}